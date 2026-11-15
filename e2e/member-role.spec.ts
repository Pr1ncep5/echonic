import { OrganizationSettingsPage } from "./pages/organization-settings-page";
import { VoicesPage } from "./pages/voices-page";
import { addCustomVoice, addMember } from "./support/seed";
import { expect, test } from "./support/test";

test.describe("roles", () => {
  test("a Member is not offered what only owners and admins may do", async ({
    organization,
    openAs,
    voicesPage,
    organizationSettingsPage,
  }) => {
    const voice = await addCustomVoice(organization.id, "Shared voice");

    await test.step("the owner is offered all of it, so its absence below means something", async () => {
      await voicesPage.goto();
      await expect(voicesPage.manageSubscriptionButton).toBeVisible();
      await voicesPage.openMenu(voice.name);
      await expect(voicesPage.deleteVoiceItem).toBeVisible();

      await organizationSettingsPage.goto();
      await expect(organizationSettingsPage.deleteButton).toBeVisible();
    });

    const memberPage = await openAs(await addMember(organization.id, "member"));

    await test.step("a Member cannot delete a Custom voice or manage the Subscription", async () => {
      const memberVoices = new VoicesPage(memberPage);
      await memberVoices.goto();
      await expect(memberVoices.currentUsage).toBeVisible();
      await expect(memberVoices.manageSubscriptionButton).toHaveCount(0);
      await memberVoices.openMenu(voice.name);
      await expect(memberVoices.deleteVoiceItem).toHaveCount(0);
    });

    await test.step("a Member can leave the Organization but not delete it", async () => {
      const memberSettings = new OrganizationSettingsPage(memberPage);
      await memberSettings.goto();
      await expect(memberSettings.leaveButton).toBeVisible();
      await expect(memberSettings.deleteButton).toHaveCount(0);
    });
  });
});
