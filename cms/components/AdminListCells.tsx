import React from 'react';
import type { DefaultServerCellComponentProps } from 'payload';

export function PublishedStatusCell({ cellData }: DefaultServerCellComponentProps) {
  const isPublished = cellData === true;

  return (
    <span className={`tm-status-cell tm-status-cell--${isPublished ? 'approved' : 'draft'}`}>
      <span aria-hidden="true" />
      {isPublished ? 'Approved' : 'Draft'}
    </span>
  );
}

const audienceLabels: Record<string, string> = {
  global: 'All visitors',
  locations: 'Selected locations',
  regions: 'Selected regions',
};

export function AnnouncementAudienceCell({ cellData }: DefaultServerCellComponentProps) {
  const value = typeof cellData === 'string' ? cellData : '';

  return <span className="tm-audience-cell">{audienceLabels[value] ?? 'Not set'}</span>;
}
