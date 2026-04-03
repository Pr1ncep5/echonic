import { History, Settings } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SettingsPanelHistory } from "./settings-panel-history";
import { SettingsPanelSettings } from "./settings-panel-settings";

const tabTriggerClassName =
  "flex-1 h-full gap-2 bg-transparent rounded-none border-x-0 border-t-0 border-b-px border-b-transparent shadow-none data-[state=active]:border-b-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none";

export function SettingsPanel() {
  return (
    <div className="hidden w-105 min-h-0 flex-col border-l lg:flex">
      <Tabs defaultValue="settings" className="flex h-full min-h-0 flex-col gap-y-0">
        <TabsList className="w-full bg-transparent rounded-none border-b h-12 group-data-[orientation=horizontal]/tabs:h-12 p-0">
          <TabsTrigger value="settings" className={tabTriggerClassName}>
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClassName}>
            <History className="size-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SettingsPanelSettings />
        </TabsContent>
        <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SettingsPanelHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
