# Polar customer is the Organization, not the User

Each Polar customer is keyed by the Organization id (`getStateExternal(orgId)`), and subscriptions and usage events attach to the Organization. We chose this over per-user billing so a team pools usage on one invoice and a Member leaving never orphans Voices or billing history. Changing it later would mean migrating Polar customers and reassigning ownership of every Voice and Generation.
