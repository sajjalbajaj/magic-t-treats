"use client";

import type { ReactNode } from "react";

import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useActionForm } from "@/components/admin/use-action-form";
import { saveSettingsAction } from "@/app/actions/content";
import type { SiteSettingsMap } from "@/types/domain";
import type { MediaAssetRow } from "@/types/database";

export function SettingsEditor({
  settings,
  assets,
}: {
  settings: SiteSettingsMap;
  assets: MediaAssetRow[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <SettingsSection
        settingKey="general"
        title="Bakery details"
        description="Your name and contact details, shown across the website."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bakery name" required>
            {({ id }) => (
              <Input id={id} name="bakeryName" required defaultValue={settings.general.bakeryName} />
            )}
          </Field>
          <Field label="Tagline">
            {({ id }) => <Input id={id} name="tagline" defaultValue={settings.general.tagline} />}
          </Field>
          <Field label="Phone">
            {({ id }) => <Input id={id} name="phone" defaultValue={settings.general.phone} />}
          </Field>
          <Field label="Email">
            {({ id }) => (
              <Input id={id} name="email" type="email" defaultValue={settings.general.email} />
            )}
          </Field>
          <Field label="Service area" className="sm:col-span-2">
            {({ id }) => (
              <Input id={id} name="serviceArea" defaultValue={settings.general.serviceArea} />
            )}
          </Field>
        </div>

        <MediaPicker
          name="logoUrl"
          label="Logo"
          assets={assets}
          defaultValue={settings.general.logoUrl}
          accept="image"
          folder="branding"
        />
        <MediaPicker
          name="faviconUrl"
          label="Favicon"
          hint="The small icon shown in the browser tab. A square PNG works best."
          assets={assets}
          defaultValue={settings.general.faviconUrl}
          accept="image"
          folder="branding"
        />
      </SettingsSection>

      <SettingsSection
        settingKey="social"
        title="Where enquiries go"
        description="Enquiries are handed off to these accounts. Add a WhatsApp number to offer it as a second option."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram profile URL">
            {({ id }) => (
              <Input
                id={id}
                name="instagramUrl"
                type="url"
                defaultValue={settings.social.instagramUrl}
                placeholder="https://www.instagram.com/yourhandle"
              />
            )}
          </Field>
          <Field label="Instagram username" hint="Without the @.">
            {({ id }) => (
              <Input
                id={id}
                name="instagramUsername"
                defaultValue={settings.social.instagramUsername}
              />
            )}
          </Field>
          <Field
            label="WhatsApp number"
            hint="Include the country code, digits only, e.g. 919876543210. Leave blank to hide WhatsApp."
            className="sm:col-span-2"
          >
            {({ id }) => (
              <Input
                id={id}
                name="whatsappNumber"
                inputMode="numeric"
                defaultValue={settings.social.whatsappNumber}
              />
            )}
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        settingKey="fulfilment"
        title="Delivery & pickup"
        description="How customers receive their orders."
      >
        <Field label="Delivery text">
          {({ id }) => (
            <Textarea
              id={id}
              name="deliveryText"
              rows={2}
              defaultValue={settings.fulfilment.deliveryText}
            />
          )}
        </Field>
        <Field label="Pickup text">
          {({ id }) => (
            <Textarea
              id={id}
              name="pickupText"
              rows={2}
              defaultValue={settings.fulfilment.pickupText}
            />
          )}
        </Field>
        <Field label="Areas served" hint="Comma separated.">
          {({ id }) => (
            <Input
              id={id}
              name="serviceAreas"
              defaultValue={settings.fulfilment.serviceAreas.join(", ")}
            />
          )}
        </Field>
      </SettingsSection>

      <SettingsSection
        settingKey="seo"
        title="Search engine defaults"
        description="What Google and social previews show when someone shares your site."
      >
        <Field label="Default page title" hint="Around 60 characters works best.">
          {({ id }) => (
            <Input id={id} name="defaultTitle" defaultValue={settings.seo.defaultTitle} />
          )}
        </Field>
        <Field label="Default description" hint="Around 155 characters works best.">
          {({ id }) => (
            <Textarea
              id={id}
              name="defaultDescription"
              rows={3}
              defaultValue={settings.seo.defaultDescription}
            />
          )}
        </Field>
        <Field label="Keywords" hint="Comma separated. Do not overdo it.">
          {({ id }) => (
            <Textarea
              id={id}
              name="keywords"
              rows={2}
              defaultValue={settings.seo.keywords.join(", ")}
            />
          )}
        </Field>
        <MediaPicker
          name="ogImageUrl"
          label="Sharing image"
          hint="Shown when your link is shared. 1200×630 is ideal."
          assets={assets}
          defaultValue={settings.seo.ogImageUrl}
          accept="image"
          folder="branding"
        />
      </SettingsSection>

      <SettingsSection
        settingKey="uploads"
        title="Upload limits"
        description="Maximum file sizes for the media library."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Max image size (MB)">
            {({ id }) => (
              <Input
                id={id}
                name="maxImageMb"
                type="number"
                min="1"
                max="50"
                defaultValue={settings.uploads.maxImageMb}
              />
            )}
          </Field>
          <Field label="Max video size (MB)">
            {({ id }) => (
              <Input
                id={id}
                name="maxVideoMb"
                type="number"
                min="5"
                max="500"
                defaultValue={settings.uploads.maxVideoMb}
              />
            )}
          </Field>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  settingKey,
  title,
  description,
  children,
}: {
  settingKey: keyof SiteSettingsMap;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { state, formAction, pending } = useActionForm(saveSettingsAction, {
    successMessage: `${title} saved.`,
  });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-base font-bold text-admin-ink">{title}</h2>
        <p className="text-xs text-admin-muted">{description}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="setting_key" value={settingKey} />
        {children}

        {state && !state.success ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.error.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" variant="admin" loading={pending} loadingLabel="Saving…">
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
