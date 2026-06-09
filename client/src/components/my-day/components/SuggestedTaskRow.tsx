import { Link } from 'react-router-dom'
import type { MyDaySuggestion } from '../../../lib/myDaySuggestions'
import AddToMyDayButton from './AddToMyDayButton'
import ProjectPinBadge from './ProjectPinBadge'

interface Props {
  suggestion: MyDaySuggestion
}

function urgencyBorderColor(urgency: MyDaySuggestion['urgency']): string {
  if (urgency === 'critical') return 'var(--accent-red)'
  if (urgency === 'warning') return 'var(--accent-gold)'
  return 'var(--accent-teal)'
}

export default function SuggestedTaskRow({ suggestion }: Props) {
  return (
    <div
      className="myday-suggested-row"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 0',
        borderBottom: '0.5px solid var(--border-default)',
        borderLeft: `3px solid ${urgencyBorderColor(suggestion.urgency)}`,
        paddingLeft: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}
        >
          {suggestion.content}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{suggestion.meta}</p>
        {suggestion.projectLabel ? (
          <div style={{ marginTop: 6 }}>
            <ProjectPinBadge label={suggestion.projectLabel} />
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <AddToMyDayButton
          compact
          usageEvent="pin_suggestion"
          content={suggestion.content}
          projectId={suggestion.projectId}
          projectLabel={suggestion.projectLabel}
        />
        {suggestion.projectId ? (
          <Link
            to={`/projects/${suggestion.projectId}`}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--accent-teal)',
              textDecoration: 'none',
              minHeight: 32,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Open project →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
