import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AttachmentService } from "./attachment.service";

async function countFiles(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(fullPath);
    } else {
      count += 1;
    }
  }
  return count;
}

describe("AttachmentService", () => {
  const prisma = {
    eventAttachment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    }
  };
  const familyAccess = {
    assertEventAccess: vi.fn(),
    assertAttachmentAccess: vi.fn()
  };

  let service: AttachmentService;
  let uploadsDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    uploadsDir = await mkdtemp(path.join(tmpdir(), "baby-tracker-uploads-"));
    process.env.UPLOADS_DIR = uploadsDir;
    service = new AttachmentService(prisma as never, familyAccess as never);
    familyAccess.assertEventAccess.mockResolvedValue({
      id: "event-1",
      familyId: "family-1",
      childId: "child-1"
    });
    familyAccess.assertAttachmentAccess.mockResolvedValue({
      id: "att-1",
      familyId: "family-1",
      childId: "child-1",
      eventId: "event-1",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      storagePath: "family-1/child-1/event-1/file.pdf"
    });
    prisma.eventAttachment.create.mockResolvedValue({ id: "att-1" });
  });

  afterEach(async () => {
    await rm(uploadsDir, { recursive: true, force: true });
  });

  it("rejects unsupported mime types", async () => {
    await expect(
      service.upload(["family-1"], {
        eventId: "event-1",
        fileName: "virus.exe",
        mimeType: "application/x-msdownload",
        buffer: Buffer.from("test")
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.eventAttachment.create).not.toHaveBeenCalled();
  });

  it("rejects files over max size", async () => {
    await expect(
      service.upload(["family-1"], {
        eventId: "event-1",
        fileName: "large.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(10 * 1024 * 1024 + 1)
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires family access before upload", async () => {
    familyAccess.assertEventAccess.mockRejectedValue(new ForbiddenException());

    await expect(
      service.upload(["family-2"], {
        eventId: "event-1",
        fileName: "report.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("pdf")
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("blocks download without family access", async () => {
    familyAccess.assertAttachmentAccess.mockRejectedValue(new ForbiddenException());

    await expect(service.getMetadata(["family-2"], "att-1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("reports missing stored file on download", async () => {
    prisma.eventAttachment.findUnique.mockResolvedValue({
      id: "att-1",
      familyId: "family-1",
      fileName: "missing.pdf",
      mimeType: "application/pdf",
      storagePath: "family-1/child-1/event-1/missing.pdf"
    });

    await expect(service.download(["family-1"], "att-1", "attachment")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("allows preview only for supported mime types", () => {
    expect(service.canPreview("application/pdf")).toBe(true);
    expect(service.canPreview("application/zip")).toBe(false);
  });

  it("removes written file when DB create fails", async () => {
    prisma.eventAttachment.create.mockRejectedValue(new Error("DB unavailable"));

    await expect(
      service.upload(["family-1"], {
        eventId: "event-1",
        fileName: "report.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("pdf")
      })
    ).rejects.toThrow("DB unavailable");

    const files = await countFiles(uploadsDir);
    expect(files).toBe(0);
  });
});
