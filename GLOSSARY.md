# Echonic

Echonic lets teams turn text into speech and clone voices, with usage billed to the team.

## Language

### Tenancy

**Organization**:
A team that owns Voices and Generations and is the unit of billing. Members share everything the Organization owns.
_Avoid_: Workspace, team, tenant, company

**Member**:
A User who belongs to an Organization.
_Avoid_: Team member, seat

### Voices

**Voice**:
A selectable speaker identity that text can be spoken in.
_Avoid_: Voice model, speaker, persona

**System voice**:
A prebuilt Voice that no Organization owns and every Organization can use.
_Avoid_: Default voice, stock voice, preset

**Custom voice**:
A Voice created by cloning, owned by one Organization and usable by all its Members.
_Avoid_: Cloned voice, user voice, private voice

**Voice cloning**:
Creating a Custom voice from an audio sample, uploaded or recorded in the browser.
_Avoid_: Voice training, voice upload

### Speech

**Generation**:
One text-to-speech result: the text, the Voice used, the settings, and the audio. It remains in the Organization's history after its Voice is deleted.
_Avoid_: Synthesis, TTS job, history item, clip

### Billing

**Subscription**:
An Organization's active paid plan with Polar. Generating speech and cloning a voice require one.
_Avoid_: Plan, license

**Usage event**:
A record of billable activity sent to Polar for an Organization: the characters of a Generation, or the creation of a Custom voice.
_Avoid_: Metric, charge, meter event

## Relationships

- An Organization owns many Custom voices and many Generations. Neither belongs to a User.
- If a Member leaves, the Custom voices they cloned stay with the Organization.
- Deleting a Voice never deletes its Generations.
