import { useRef, useState } from 'react';
import { getToken } from '@/lib/session';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import { Avatar, Button, Modal } from '@/components/ui';

/**
 * Avatar editor: shows the current image and opens a modal to set it by URL or
 * by uploading a file. Reverts to the original value when canceled.
 */
export function AvatarField({
  label,
  value,
  name,
  onChange,
}: {
  label: string;
  value: string;
  name: string;
  onChange: (v: string) => void;
}) {
  const { pushToast } = useNotificationsUi();
  const fileRef = useRef<HTMLInputElement>(null);
  // Value when the modal opened, so "Cancel" can revert the change.
  const originalRef = useRef(value);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  function openModal() {
    originalRef.current = value;
    setEditing(true);
  }
  function cancel() {
    onChange(originalRef.current);
    setEditing(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      // fetch (not the JSON axios instance) so the browser sets the multipart
      // boundary itself; the upload is gated by our JWT.
      const fd = new FormData();
      fd.append('file', file);
      const base = (import.meta.env.VITE_API_URL as string) ?? '/api';
      const res = await fetch(`${base}/users/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        message?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.message ?? 'Could not upload the image');
      }
      onChange(data.url);
      pushToast('Image uploaded');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Error uploading the image');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={openModal}
          title="Change image"
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <Avatar url={value || null} name={name} size={108} />
        </button>
        <span className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Tap the image to change it
        </span>
      </div>

      {editing && (
        <Modal title={label} onClose={cancel}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Avatar url={value || null} name={name} size={168} />
          </div>
          <label className="field__label">Image URL</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
              className="field__input"
              style={{ flex: 1 }}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
              autoComplete="off"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onFile}
              style={{ display: 'none' }}
            />
            <Button
              type="button"
              variant="secondary"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Paste a link or upload an image (PNG/JPG/WEBP/GIF, max 2MB).
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button style={{ flex: 1 }} onClick={() => setEditing(false)}>
              Save
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={cancel}
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
