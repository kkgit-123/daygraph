import { useState } from 'react';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import Panel from '../ui/Panel';
import { ErrorBox, Skeleton } from '../ui/States';
import { shortDate } from '../../lib/dates';
import { truncate } from '../../lib/format';
import { useCreateLink, useDeleteLink, useLinks } from '../../api/hooks';

const STATUS = {
  queued: ['Queued', 'warn'],
  metadata_only: ['Title only', 'quiet'],
  failed: ['Could not read', 'conflict'],
};

export default function SavedReading() {
  const { data: links = [], isLoading, error, refetch } = useLinks();
  const create = useCreateLink();
  const remove = useDeleteLink();
  const [url, setUrl] = useState('');

  const add = () => {
    const value = url.trim();
    if (!value) return;
    create.mutate(value, { onSuccess: () => setUrl('') });
  };

  return (
    <Panel className="p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-[19px] font-bold">Saved reading</h2>
        <p className="text-muted mt-1 text-[13.5px]">Links you saved. Only you can see them.</p>
      </div>
      <div className="flex gap-2.5">
        <Field value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link to save" aria-label="Link to save"
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <Button variant="secondary" disabled={!url.trim() || create.isPending} onClick={add}>Save</Button>
      </div>
      {error ? <ErrorBox error={error} onRetry={refetch} />
        : isLoading ? <Skeleton className="h-16" />
          : links.length === 0 ? <p className="text-muted text-[13.5px]">Nothing saved yet.</p>
            : (
              <ul className="flex flex-col">
                {links.map((l) => {
                  const badge = STATUS[l.status];
                  return (
                    <li key={l.id} className="flex gap-3 items-start py-3 border-t border-divider">
                      <div className="flex-1 min-w-0">
                        <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold leading-[1.4] hover:underline break-words">{l.title || l.url}</a>
                        {l.summary && <div className="text-muted text-[13.5px] mt-0.5">{truncate(l.summary, 140)}</div>}
                        <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                          <span className="text-muted text-[12.5px]">Saved {shortDate(l.savedAt)}</span>
                          {badge && <Chip tone={badge[1]}>{badge[0]}</Chip>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" aria-label={`Remove ${l.title || l.url}`} disabled={remove.isPending} onClick={() => remove.mutate(l.id)}>Remove</Button>
                    </li>
                  );
                })}
              </ul>
            )}
    </Panel>
  );
}
