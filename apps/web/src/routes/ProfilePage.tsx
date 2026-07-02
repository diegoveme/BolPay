import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usePollar } from '@pollar/react';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import { roleLabel } from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Button,
  Card,
  Field,
  PageHeader,
  TextareaField,
} from '@/components/ui';
import { AvatarField } from './profile/AvatarField';
import { InvitationsCard } from './profile/InvitationsCard';

/**
 * Profile settings: shows the linked Stellar wallet, lets the user edit their
 * company or freelancer profile, and (for companies/admins) manage email
 * invitations.
 */
export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const pollar = usePollar();
  const { pushToast } = useNotificationsUi();

  const cp = user?.companyProfile;
  const [company, setCompany] = useState({
    name: cp?.name ?? '',
    description: cp?.description ?? '',
    location: cp?.location ?? '',
    website: cp?.website ?? '',
    industry: cp?.industry ?? '',
    values: cp?.values ?? '',
    avatarUrl: cp?.avatarUrl ?? '',
  });
  const setC = (k: keyof typeof company, v: string) =>
    setCompany((s) => ({ ...s, [k]: v }));

  const fp = user?.freelancerProfile;
  const [freelancer, setFreelancer] = useState({
    displayName: fp?.displayName ?? '',
    headline: fp?.headline ?? '',
    bio: fp?.bio ?? '',
    skills: (fp?.skills ?? []).join(', '),
    location: fp?.location ?? '',
    website: fp?.website ?? '',
    linkedin: fp?.linkedin ?? '',
    github: fp?.github ?? '',
    avatarUrl: fp?.avatarUrl ?? '',
  });
  const setF = (k: keyof typeof freelancer, v: string) =>
    setFreelancer((s) => ({ ...s, [k]: v }));

  const clean = (v: string) => v.trim() || undefined;

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (user?.role === 'company') {
        return api.patch('/users/me/company-profile', {
          name: clean(company.name),
          description: clean(company.description),
          location: clean(company.location),
          website: clean(company.website),
          industry: clean(company.industry),
          values: clean(company.values),
          avatarUrl: clean(company.avatarUrl),
        });
      }
      return api.patch('/users/me/freelancer-profile', {
        displayName: clean(freelancer.displayName),
        headline: clean(freelancer.headline),
        bio: clean(freelancer.bio),
        skills: freelancer.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        location: clean(freelancer.location),
        website: clean(freelancer.website),
        linkedin: clean(freelancer.linkedin),
        github: clean(freelancer.github),
        avatarUrl: clean(freelancer.avatarUrl),
      });
    },
    onSuccess: () => {
      pushToast('Profile updated');
      void refreshUser();
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (!user) return null;

  return (
    <>
      <PageHeader title="Profile" subtitle={`${roleLabel[user.role]} · ${user.email}`} />

      <Card title="Stellar wallet">
        <div className="row" style={{ gap: 24 }}>
          <div>
            <p className="muted" style={{ fontSize: 13 }}>Address</p>
            <p className="mono">{user.stellarAddress ?? 'No wallet linked'}</p>
          </div>
          {pollar.isAuthenticated && (
            <div className="row">
              <Button variant="secondary" onClick={() => pollar.openWalletBalanceModal()}>
                View balance
              </Button>
              <Button variant="secondary" onClick={() => pollar.openReceiveModal()}>
                Receive
              </Button>
              <Button variant="secondary" onClick={() => pollar.openSendModal()}>
                Send
              </Button>
            </div>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Your milestone and payroll payments arrive directly at this address on
          the Stellar network.
        </p>
      </Card>

      {user.role === 'company' && (
        <Card title="Company profile">
          <AvatarField
            label="Logo (URL)"
            value={company.avatarUrl}
            name={company.name}
            onChange={(v) => setC('avatarUrl', v)}
          />
          <Field
            label="Company name"
            value={company.name}
            onChange={(e) => setC('name', e.target.value)}
          />
          <div className="form-grid">
            <Field
              label="Location"
              value={company.location}
              onChange={(e) => setC('location', e.target.value)}
              placeholder="Cuernavaca, Mexico"
            />
            <Field
              label="Sector / industry"
              value={company.industry}
              onChange={(e) => setC('industry', e.target.value)}
              placeholder="Software, fintech…"
            />
          </div>
          <Field
            label="Website"
            value={company.website}
            onChange={(e) => setC('website', e.target.value)}
            placeholder="https://yourcompany.com"
          />
          <TextareaField
            label="Description"
            value={company.description}
            onChange={(v) => setC('description', v)}
          />
          <TextareaField
            label="Values / culture"
            value={company.values}
            onChange={(v) => setC('values', v)}
            placeholder="Transparency, quality, on-time delivery…"
          />
          <Button loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            Save
          </Button>
        </Card>
      )}

      {user.role === 'freelancer' && (
        <Card title="Professional profile">
          <AvatarField
            label="Photo (URL)"
            value={freelancer.avatarUrl}
            name={freelancer.displayName}
            onChange={(v) => setF('avatarUrl', v)}
          />
          <div className="form-grid">
            <Field
              label="Public name"
              value={freelancer.displayName}
              onChange={(e) => setF('displayName', e.target.value)}
            />
            <Field
              label="Location"
              value={freelancer.location}
              onChange={(e) => setF('location', e.target.value)}
              placeholder="Lima, Peru"
            />
          </div>
          <Field
            label="Headline"
            value={freelancer.headline}
            onChange={(e) => setF('headline', e.target.value)}
            placeholder="Full-stack developer · React / NestJS"
          />
          <TextareaField
            label="Bio"
            value={freelancer.bio}
            onChange={(v) => setF('bio', v)}
            placeholder="Tell companies what you're great at…"
          />
          <Field
            label="Skills (comma-separated)"
            value={freelancer.skills}
            onChange={(e) => setF('skills', e.target.value)}
            placeholder="React, NestJS, UI/UX, Figma"
          />
          <div className="form-grid">
            <Field
              label="Site / portfolio"
              value={freelancer.website}
              onChange={(e) => setF('website', e.target.value)}
              placeholder="https://myportfolio.com"
            />
            <Field
              label="LinkedIn"
              value={freelancer.linkedin}
              onChange={(e) => setF('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/your-username"
            />
          </div>
          <Field
            label="GitHub"
            value={freelancer.github}
            onChange={(e) => setF('github', e.target.value)}
            placeholder="https://github.com/your-username"
          />
          <Button loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            Save
          </Button>
        </Card>
      )}

      {(user.role === 'company' || user.role === 'administrator') && <InvitationsCard />}
    </>
  );
}
