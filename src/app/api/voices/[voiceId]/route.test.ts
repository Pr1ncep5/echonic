import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";
import {
  createCustomVoice,
  createMember,
  createOrganization,
  createSystemVoice,
} from "@/tests/factories";
import { signInAs } from "@/tests/session";
import { GET } from "./route";

function getVoiceAudio(voiceId: string) {
  return GET(new Request(`${env.APP_URL}/api/voices/${voiceId}`), {
    params: Promise.resolve({ voiceId }),
  });
}

describe("GET /api/voices/[voiceId]", () => {
  it("rejects a caller who is not signed in", async () => {
    const system = await createSystemVoice();

    expect((await getVoiceAudio(system.id)).status).toBe(401);
  });

  it("serves a System voice to a Member of any Organization", async () => {
    const system = await createSystemVoice();

    for (const name of ["First", "Second"]) {
      const org = await createOrganization(name);
      signInAs(await createMember(org.id));
      expect((await getVoiceAudio(system.id)).status).toBe(200);
    }
  });

  it("serves a Custom voice to a Member of its Organization", async () => {
    const org = await createOrganization();
    const custom = await createCustomVoice(org.id);
    signInAs(await createMember(org.id));

    expect((await getVoiceAudio(custom.id)).status).toBe(200);
  });

  it("hides another Organization's Custom voice", async () => {
    const [ours, theirs] = [await createOrganization("Ours"), await createOrganization("Theirs")];
    const foreign = await createCustomVoice(theirs.id);
    signInAs(await createMember(ours.id));

    expect((await getVoiceAudio(foreign.id)).status).toBe(404);
  });
});
