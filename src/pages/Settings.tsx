import { Bell, Eye, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import PageShell from '@/components/PageShell';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePreferences } from '@/contexts/PreferencesContext';

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
  },
];

const preferenceOptions = [
  {
    key: 'activityAlerts',
    label: 'Activity alerts',
    icon: Bell,
  },
  {
    key: 'focusContrast',
    label: 'Focus contrast',
    icon: Eye,
  },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { preferences, updatePreference, resetPreferences } = usePreferences();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PageShell
      title="Settings"
      description="Theme and interaction preferences."
    >
      <Tabs defaultValue="appearance">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map(({ value, label, icon: Icon }) => {
                const active = mounted && theme === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className={active ? 'text-primary-foreground' : ''}>
                      <Icon className="size-5" />
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Behavior</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {preferenceOptions.map(({ key, label, icon: Icon }) => {
                const active = preferences[key];

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {label}
                        </span>
                      </span>
                    </div>
                    <Switch
                      checked={active}
                      onCheckedChange={() => updatePreference(key)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Preference guide</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="theme">
                  <AccordionTrigger>Which theme should I use?</AccordionTrigger>
                  <AccordionContent>
                    System theme follows your device. Light and dark themes keep
                    the workspace fixed regardless of operating system changes.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="alerts">
                  <AccordionTrigger>
                    What do activity alerts change?
                  </AccordionTrigger>
                  <AccordionContent>
                    Activity alerts add confirmation steps around important
                    account actions so changes are harder to submit by mistake.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="contrast">
                  <AccordionTrigger>
                    When should focus contrast be on?
                  </AccordionTrigger>
                  <AccordionContent>
                    Use focus contrast when you want stronger borders and
                    clearer separation between interactive areas.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setTheme('system')}>
          <Monitor className="size-4" />
          Use system theme
        </Button>
        <Button variant="outline" onClick={resetPreferences}>
          Reset preferences
        </Button>
      </div>
    </PageShell>
  );
}
