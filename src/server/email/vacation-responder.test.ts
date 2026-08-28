import { describe, expect, it } from "vitest";
import { classifyVacationReplyEligibility } from "@/server/email/vacation-responder.service";

describe("vacation responder eligibility", () => {
  const mailboxAddress = "student1234@researvia.test";

  it("allows a normal professor reply", () => {
    expect(classifyVacationReplyEligibility({
      from: "Professor Ada <ada@university.edu>",
      mailboxAddress,
      rawHeaders: { "message-id": "<normal@university.edu>" }
    })).toEqual({ eligible: true, reason: null });
  });

  it("suppresses automated and mailing-list messages", () => {
    expect(classifyVacationReplyEligibility({
      from: "bot@university.edu",
      mailboxAddress,
      rawHeaders: { "Auto-Submitted": "auto-generated" }
    }).reason).toBe("auto-submitted");
    expect(classifyVacationReplyEligibility({
      from: "updates@university.edu",
      mailboxAddress,
      rawHeaders: { "List-Id": "research-list.university.edu" }
    }).reason).toBe("mailing-list");
    expect(classifyVacationReplyEligibility({
      from: "digest@university.edu",
      mailboxAddress,
      rawHeaders: { Precedence: "bulk" }
    }).reason).toBe("bulk-or-list");
  });

  it("suppresses no-reply senders, self-mail and ResearVia auto replies", () => {
    expect(classifyVacationReplyEligibility({ from: "no-reply@university.edu", mailboxAddress }).reason).toBe("no-reply-sender");
    expect(classifyVacationReplyEligibility({ from: mailboxAddress, mailboxAddress }).reason).toBe("self-message");
    expect(classifyVacationReplyEligibility({
      from: "student5678@researvia.test",
      mailboxAddress,
      rawHeaders: { "X-ResearVia-Auto-Reply": "vacation" }
    }).reason).toBe("researvia-auto-reply");
  });
});
