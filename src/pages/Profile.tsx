import { zodResolver } from '@hookform/resolvers/zod';
import {
  BriefcaseBusiness,
  Building2,
  Copy,
  FileText,
  IdCard,
  ImageUp,
  Mail,
  MapPin,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';
import { z } from 'zod';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import ServerErrorFrame from '@/components/ServerErrorFrame';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { updateUserInfo } from '@/utils/api';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  avatarUrl: z.string().nullable(),
  bio: z.string().max(180, 'Bio must be 180 characters or less'),
  title: z.string().max(80, 'Title must be 80 characters or less'),
  company: z.string().max(80, 'Company must be 80 characters or less'),
  location: z.string().max(80, 'Location must be 80 characters or less'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
const AVATAR_LIMIT_MB = 10;
const AVATAR_LIMIT_BYTES = AVATAR_LIMIT_MB * 1024 * 1024;

export default function ProfilePage() {
  const { user, firebaseUser, refreshProfile, loading, error, clearError } =
    useAuth();
  const { preferences } = usePreferences();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [avatarEditorSrc, setAvatarEditorSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      avatarUrl: user?.avatarUrl ?? '',
      bio: user?.bio ?? '',
      title: user?.title ?? '',
      company: user?.company ?? '',
      location: user?.location ?? '',
    },
  });

  useEffect(() => {
    if (!user) return;

    form.reset({
      displayName: user.displayName ?? '',
      avatarUrl: user.avatarUrl ?? '',
      bio: user.bio ?? '',
      title: user.title ?? '',
      company: user.company ?? '',
      location: user.location ?? '',
    });
  }, [user, firebaseUser, form]);

  const handleRetry = () => {
    clearError();
    refreshProfile();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ServerErrorFrame onRetry={handleRetry} />;
  if (!user) return null;

  const persistProfile = (values: ProfileFormValues) => {
    setSaving(true);

    toast
      .promise(updateUserInfo(user.id, values), {
        loading: 'Saving profile…',
        success: 'Profile updated!',
        error: {
          message: 'Update failed',
          description: 'Could not update profile info.',
        },
      })
      .unwrap()
      .then(async () => {
        await refreshProfile();
        form.reset(values);
        setSaveOpen(false);
      })
      .catch((err) => {
        console.error('Profile save error:', err);
      })
      .finally(() => setSaving(false));
  };

  const handleSaveClick = form.handleSubmit((values) => {
    if (preferences.activityAlerts) {
      setSaveOpen(true);
      return;
    }

    persistProfile(values);
  });

  const copyValue = async (label: string, value?: string | null) => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleAvatarFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    if (file.size > AVATAR_LIMIT_BYTES) {
      toast.error(`Avatar image should be smaller than ${AVATAR_LIMIT_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarEditorSrc(String(reader.result));
    };
    reader.onerror = () => {
      toast.error('Could not read that image file.');
    };
    reader.readAsDataURL(file);
  };

  const onCropImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
      const initial = centerCrop(
        makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
        width,
        height,
      );
      setCrop(initial);
    },
    [],
  );

  const applyAvatarCrop = () => {
    const image = cropImageRef.current;
    if (!image || !completedCrop) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) {
      toast.error('Could not prepare that avatar image.');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    context.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      512,
      512,
    );

    const dataUrl = canvas.toDataURL('image/webp', 0.92);
    setAvatarEditorSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);

    setSaving(true);
    toast
      .promise(
        updateUserInfo(user!.id, { ...form.getValues(), avatarUrl: dataUrl }),
        {
          loading: 'Saving avatar…',
          success: 'Avatar updated!',
          error: 'Could not save avatar.',
        },
      )
      .unwrap()
      .then(async () => {
        await refreshProfile();
        form.setValue('avatarUrl', dataUrl, {
          shouldDirty: false,
          shouldValidate: true,
        });
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location detection is not available in this browser.');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const fallbackLocation = `${coords.latitude.toFixed(
          4,
        )}, ${coords.longitude.toFixed(4)}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          const data = await response.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.municipality ||
            data.address?.county;
          const country = data.address?.country;
          const location = [city, country].filter(Boolean).join(', ');

          form.setValue('location', location || fallbackLocation, {
            shouldDirty: true,
            shouldValidate: true,
          });
          toast.success('Location added to your profile.');
        } catch {
          form.setValue('location', fallbackLocation, {
            shouldDirty: true,
            shouldValidate: true,
          });
          toast.success('Location coordinates added.');
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
        toast.error('Location permission was not granted.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const avatarPreview = form.watch('avatarUrl');
  const avatarSrc =
    avatarPreview || user.avatarUrl || firebaseUser?.photoURL || undefined;

  const removeAvatar = () => setRemoveAvatarOpen(true);

  const confirmRemoveAvatar = () => {
    if (!user) return;
    setRemovingAvatar(true);
    toast
      .promise(
        updateUserInfo(user.id, {
          ...form.getValues(),
          avatarUrl: null,
        }),
        {
          loading: 'Removing avatar…',
          success: 'Avatar removed',
          error: 'Could not remove avatar',
        },
      )
      .unwrap()
      .then(async () => {
        await refreshProfile();
        form.setValue('avatarUrl', null, { shouldDirty: false });
        setRemoveAvatarOpen(false);
      })
      .catch(() => {})
      .finally(() => setRemovingAvatar(false));
  };

  return (
    <PageShell
      title="Profile"
      description="Manage account details and public workspace identity."
    >
      <Card>
        <CardContent>
          <Form {...form}>
            <form className="space-y-5">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onClick={(event) => {
                  (event.target as HTMLInputElement).value = '';
                }}
                onChange={(event) => handleAvatarFile(event.target.files?.[0])}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <input type="hidden" {...field} value={field.value ?? ''} />
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="group relative cursor-pointer rounded-full"
                        onClick={() => avatarInputRef.current?.click()}
                        aria-label="Upload avatar"
                      >
                        <UserAvatar
                          src={avatarSrc}
                          name={user.displayName ?? user.email}
                          className="size-16"
                        />
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                          <ImageUp className="size-4" />
                        </span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">
                          {user.displayName || 'New account'}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="size-4 shrink-0" />
                          <span className="truncate">{user.email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-5 shrink-0"
                            onClick={() => copyValue('Email', user.email)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                        {firebaseUser?.uid && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <IdCard className="size-4 shrink-0" />
                            <span className="truncate font-mono">
                              {firebaseUser.uid}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-5 shrink-0"
                              onClick={() => copyValue('UID', firebaseUser.uid)}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          <ImageUp className="size-4" />
                          Upload
                        </Button>
                        {user.avatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={removeAvatar}
                          >
                            <Trash2 className="size-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex Morgan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <BriefcaseBusiness className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Your role"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Your workplace"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="City, Country"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={handleDetectLocation}
                          disabled={detectingLocation}
                        >
                          <MapPin className="size-4" />
                          <span className="hidden sm:inline">
                            {detectingLocation ? 'Detecting…' : 'Detect'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Textarea
                          placeholder="Tell people what you are working on."
                          className="min-h-[80px] resize-y pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {preferences.activityAlerts ? (
                <ResponsiveModal open={saveOpen} onOpenChange={setSaveOpen}>
                  <Button
                    type="button"
                    disabled={!form.formState.isDirty || saving}
                    onClick={handleSaveClick}
                  >
                    <Save className="size-4" />
                    Save changes
                  </Button>
                  <ResponsiveModalContent showCloseButton={false}>
                    <ResponsiveModalHeader>
                      <ResponsiveModalTitle>
                        Save profile changes?
                      </ResponsiveModalTitle>
                      <ResponsiveModalDescription>
                        Your updated profile details will be synced with your
                        account.
                      </ResponsiveModalDescription>
                    </ResponsiveModalHeader>
                    <ResponsiveModalFooter>
                      <ResponsiveModalClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </ResponsiveModalClose>
                      <Button
                        onClick={() => persistProfile(form.getValues())}
                        disabled={saving}
                      >
                        <Save className="size-4" />
                        Confirm
                      </Button>
                    </ResponsiveModalFooter>
                  </ResponsiveModalContent>
                </ResponsiveModal>
              ) : (
                <Button
                  type="button"
                  disabled={!form.formState.isDirty || saving}
                  onClick={handleSaveClick}
                >
                  <Save className="size-4" />
                  Save changes
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <ResponsiveModal
        open={Boolean(avatarEditorSrc)}
        onOpenChange={(open) => {
          if (!open) setAvatarEditorSrc(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Prepare profile photo</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Preview the selected image before it is cropped into a square
              avatar.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          {avatarEditorSrc && (
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={cropImageRef}
                  src={avatarEditorSrc}
                  alt="Crop preview"
                  className="max-h-80 max-w-full"
                  onLoad={onCropImageLoad}
                />
              </ReactCrop>
            </div>
          )}
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button type="button" onClick={applyAvatarCrop}>
              Use photo
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={removeAvatarOpen}
        onOpenChange={setRemoveAvatarOpen}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Remove profile photo?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Your avatar will be permanently removed. This cannot be undone.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline" disabled={removingAvatar}>
                Cancel
              </Button>
            </ResponsiveModalClose>
            <Button
              variant="destructive"
              disabled={removingAvatar}
              onClick={confirmRemoveAvatar}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </PageShell>
  );
}
