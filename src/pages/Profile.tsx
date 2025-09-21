import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import LoadingSpinner from '@/components/LoadingSpinner';
import ServerErrorFrame from '@/components/ServerErrorFrame';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserInfo } from '@/utils/api';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, firebaseUser, refreshProfile, loading, error, clearError } =
    useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.displayName ?? '' },
  });

  useEffect(() => {
    if (user?.displayName) form.reset({ displayName: user.displayName });
  }, [user, form]);

  const handleRetry = () => {
    clearError();
    refreshProfile();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ServerErrorFrame onRetry={handleRetry} />;
  if (!user) return null;

  const handleConfirmSave = () => {
    setSaving(true);
    toast
      .promise(updateUserInfo(user.id, form.getValues().displayName), {
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
        form.reset(form.getValues());
        setSaveOpen(false);
      })
      .catch((err) => {
        console.error('Profile save error:', err);
        // optionally set global error if needed
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {firebaseUser?.photoURL ? (
                <AvatarImage
                  src={firebaseUser.photoURL}
                  alt={user.displayName ?? ''}
                />
              ) : (
                <AvatarFallback>
                  {user.displayName?.[0] ?? user.email[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Form {...form}>
            <form className="space-y-4">
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input value={user.email} disabled />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ResponsiveModal open={saveOpen} onOpenChange={setSaveOpen}>
                <ResponsiveModalTrigger asChild>
                  <Button disabled={!form.formState.isDirty || saving}>
                    Save
                  </Button>
                </ResponsiveModalTrigger>
                <ResponsiveModalContent>
                  <ResponsiveModalHeader>
                    <ResponsiveModalTitle>Confirm Save</ResponsiveModalTitle>
                    <ResponsiveModalDescription>
                      Do you want to update your profile information?
                    </ResponsiveModalDescription>
                  </ResponsiveModalHeader>
                  <ResponsiveModalFooter>
                    <ResponsiveModalClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </ResponsiveModalClose>
                    <Button onClick={handleConfirmSave} disabled={saving}>
                      Confirm
                    </Button>
                  </ResponsiveModalFooter>
                </ResponsiveModalContent>
              </ResponsiveModal>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
