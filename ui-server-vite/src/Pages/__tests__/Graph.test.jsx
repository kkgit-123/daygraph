import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Link, Route, Routes } from 'react-router-dom';
import Graph from '../Graph';
import { seededGraph } from '../../graph/__tests__/fixtures';
import { renderWithProviders } from '../../test/renderWithProviders';

/* the API is replaced by fixtures; no network */
const api = vi.hoisted(() => ({ graph: null }));
vi.mock('../../api/hooks', () => ({
  useGraph: () => ({ data: api.graph, isLoading: false, error: null, refetch: () => {} }),
  useAskFlow: () => () => {},
}));

const node = (title) => screen.getByRole('button', { name: title });
const nodeOrNull = (name) => screen.queryByRole('button', { name });
const DECISION_1 = 'Decision: Target an early November launch';
const DECISION_2 = 'Decision: Lock the payments launch for 1 November';
const DECISION_3 = 'Decision: Move the payments launch to 15 November';
const detailTitle = () => document.querySelector('aside h2').textContent;
const edgeDivs = (container) => [...container.querySelectorAll('div[aria-hidden="true"][style*="position: absolute"]')]
  .filter((el) => !el.style.borderLeft);
const renderGraph = (opts) => renderWithProviders(<Graph />, { route: '/graph', ...opts });

beforeEach(() => {
  api.graph = seededGraph({ conflict: 'pending' });
});

describe('selection', () => {
  it('defaults to the newest decision and dims everything that is not a neighbour', () => {
    renderGraph();
    expect(detailTitle()).toBe('Move the payments launch to 15 November');
    expect(node(DECISION_3)).toHaveAttribute('aria-pressed', 'true');
    // neighbours of d3: topic, d2 (conflict), m3, t3
    expect(node('Topic: Payments launch date')).not.toHaveClass('opacity-40');
    expect(node(DECISION_2)).not.toHaveClass('opacity-40');
    expect(node('Meeting: Payments launch sync')).not.toHaveClass('opacity-40');
    expect(node(DECISION_1)).toHaveClass('opacity-40');
    expect(node('Meeting: Quarter planning')).toHaveClass('opacity-40');
    expect(node('Task: Draft the launch checklist')).toHaveClass('opacity-40');
  });

  it('selects a node on click and moves the dimming with it', () => {
    renderGraph();
    fireEvent.click(node(DECISION_1));
    expect(detailTitle()).toBe('Target an early November launch');
    expect(node(DECISION_1)).toHaveClass('shadow-[0_0_0_4px_rgba(53,64,211,.28)]');
    expect(node(DECISION_3)).toHaveClass('opacity-40');
    expect(node(DECISION_2)).not.toHaveClass('opacity-40');
  });

  it('keeps the selection when the user navigates away and back', () => {
    renderWithProviders(null, {
      route: '/graph',
      routes: (
        <Routes>
          <Route path="/graph" element={<><Link to="/elsewhere">go elsewhere</Link><Graph /></>} />
          <Route path="/elsewhere" element={<Link to="/graph">back to graph</Link>} />
        </Routes>
      ),
    });
    fireEvent.click(node(DECISION_2));
    expect(detailTitle()).toBe('Lock the payments launch for 1 November');
    fireEvent.click(screen.getByRole('link', { name: 'go elsewhere' }));
    fireEvent.click(screen.getByRole('link', { name: 'back to graph' }));
    expect(detailTitle()).toBe('Lock the payments launch for 1 November');
  });

  it('follows a "Connected to" entry to the neighbour', () => {
    renderGraph();
    fireEvent.click(node(DECISION_3));
    const connected = screen.getByText('Connected to').parentElement;
    fireEvent.click(within(connected).getByRole('button', { name: /Lock the payments launch/ }));
    expect(detailTitle()).toBe('Lock the payments launch for 1 November');
  });
});

describe('filters and labels', () => {
  it('hides a kind and every edge that touches it', () => {
    const { container } = renderGraph();
    const before = edgeDivs(container).length;
    fireEvent.click(screen.getByRole('button', { name: 'Meetings' }));
    expect(nodeOrNull('Meeting: Quarter planning')).toBeNull();
    expect(nodeOrNull('Meeting: Launch planning')).toBeNull();
    expect(screen.getByRole('button', { name: 'Meetings' })).toHaveAttribute('aria-pressed', 'false');
    expect(edgeDivs(container).length).toBeLessThan(before);
  });

  it('hides people and tasks independently', () => {
    renderGraph();
    fireEvent.click(screen.getByRole('button', { name: 'People' }));
    expect(nodeOrNull('Person: Rahul Menon')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    expect(nodeOrNull('Task: Draft the launch checklist')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'People' }));
    expect(node('Person: Rahul Menon')).toBeInTheDocument();
  });

  it('moves the selection to the newest decision when the selected kind is hidden', () => {
    renderGraph();
    fireEvent.click(node('Task: Draft the launch checklist'));
    expect(detailTitle()).toBe('Draft the launch checklist');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    expect(detailTitle()).toBe('Move the payments launch to 15 November');
  });

  it('shows supersedes labels always and other labels only with Relationship names on', () => {
    renderGraph();
    expect(screen.getByText('supersedes')).toBeInTheDocument();
    expect(screen.queryByText('decided in')).toBeNull();
    expect(screen.queryByText('attended')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Relationship names' }));
    expect(screen.getAllByText('decided in')).toHaveLength(3);
    expect(screen.getAllByText('attended')).toHaveLength(5);
    expect(screen.getAllByText('about')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Relationship names' }));
    expect(screen.queryByText('decided in')).toBeNull();
    expect(screen.getByText('supersedes')).toBeInTheDocument();
  });
});

describe('conflict edge', () => {
  it('pending: dashed red line and a "conflict?" chip', () => {
    renderGraph();
    expect(screen.getByText('conflict?')).toBeInTheDocument();
    expect(screen.getByText('conflict?').className).toMatch(/bg-conflict-tint/);
    expect(screen.getByText('Waiting for your review')).toBeInTheDocument();
    expect(screen.getByText('1 conflict to review')).toBeInTheDocument();
  });

  it('accepted: a solid "supersedes" arrow, no conflict chip', () => {
    api.graph = seededGraph({ conflict: 'accepted' });
    renderGraph();
    expect(screen.queryByText('conflict?')).toBeNull();
    expect(screen.queryByText('kept both')).toBeNull();
    expect(screen.getAllByText('supersedes')).toHaveLength(2);
    expect(screen.getByText('No open conflicts')).toBeInTheDocument();
  });

  it('kept both: a grey "kept both" label', () => {
    api.graph = seededGraph({ conflict: 'both' });
    renderGraph();
    expect(screen.getByText('kept both')).toBeInTheDocument();
    expect(screen.queryByText('conflict?')).toBeNull();
    expect(screen.getByText('No open conflicts')).toBeInTheDocument();
  });

  it('dismissed: the conflict edge is not drawn at all', () => {
    api.graph = seededGraph({ conflict: 'dismissed' });
    renderGraph();
    expect(screen.queryByText('conflict?')).toBeNull();
    expect(screen.queryByText('kept both')).toBeNull();
    expect(screen.getAllByText('supersedes')).toHaveLength(1);
  });
});
