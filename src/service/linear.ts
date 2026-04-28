const LINEAR_API_URL = 'https://api.linear.app/graphql';

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  estimate?: number | null;
  state: {
    name: string;
    color: string;
  };
  team: {
    id: string;
    name: string;
  };
}

export interface LinearTeam {
  id: string;
  name: string;
}

export interface LinearProject {
  id: string;
  name: string;
  state: string;
  issueCount: number;
}

export interface LinearCycle {
  id: string;
  name?: string | null;
  number: number;
  startsAt?: string | null;
  endsAt?: string | null;
  team: { id: string; name: string };
}

export interface LinearCustomView {
  id: string;
  name: string;
  description?: string | null;
  shared: boolean;
  team?: { id: string; name: string } | null;
}

// ── Core GraphQL client ────────────────────────────────────────────────────────

async function linearQuery<T>(
  authHeader: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (!response.ok) {
    const msg = json?.errors?.[0]?.message || json?.error || response.statusText;
    throw new Error(`Linear API error: ${response.status} — ${msg}`);
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

// ── Shared fragment ────────────────────────────────────────────────────────────

const ISSUE_FIELDS = `
  id
  identifier
  title
  url
  estimate
  state { name color }
  team { id name }
`;

// ── Auth ───────────────────────────────────────────────────────────────────────

export const validateLinearApiKey = async (apiKey: string): Promise<string> => {
  const data = await linearQuery<{ viewer: { name: string } }>(
    apiKey,
    `query { viewer { name } }`,
  );
  return data.viewer.name;
};

// ── Teams ──────────────────────────────────────────────────────────────────────

export const getLinearTeams = async (apiKey: string): Promise<LinearTeam[]> => {
  const data = await linearQuery<{ teams: { nodes: LinearTeam[] } }>(
    apiKey,
    `query { teams(first: 50) { nodes { id name } } }`,
  );
  return data.teams.nodes;
};

// ── Issue search ───────────────────────────────────────────────────────────────

export const searchLinearIssues = async (
  apiKey: string,
  query: string,
  teamId?: string,
): Promise<LinearIssue[]> => {
  const filter = buildIssueFilter(query, teamId);
  const gql = `
    query SearchIssues($filter: IssueFilter) {
      issues(filter: $filter, first: 25, orderBy: updatedAt) {
        nodes { ${ISSUE_FIELDS} }
      }
    }
  `;
  const data = await linearQuery<{ issues: { nodes: LinearIssue[] } }>(apiKey, gql, { filter });
  return data.issues.nodes;
};

function buildIssueFilter(query: string, teamId?: string): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    state: { type: { nin: ['completed', 'cancelled'] } },
  };
  if (query.trim()) {
    filter.title = { containsIgnoreCase: query.trim() };
  }
  if (teamId) {
    filter.team = { id: { eq: teamId } };
  }
  return filter;
}

// ── Projects ───────────────────────────────────────────────────────────────────

export const getLinearProjects = async (apiKey: string): Promise<LinearProject[]> => {
  const gql = `
    query {
      projects(first: 250) {
        nodes {
          id
          name
          state
        }
      }
    }
  `;
  const data = await linearQuery<{
    projects: {
      nodes: Array<{ id: string; name: string; state: string }>;
    };
  }>(apiKey, gql);
  return data.projects.nodes.map((p) => ({ id: p.id, name: p.name, state: p.state, issueCount: 0 }));
};

export const getProjectIssues = async (
  apiKey: string,
  projectId: string,
): Promise<LinearIssue[]> => {
  const gql = `
    query ProjectIssues($projectId: String!) {
      project(id: $projectId) {
        issues(
          filter: { state: { type: { nin: ["completed", "cancelled"] } } }
          first: 100
        ) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    }
  `;
  const data = await linearQuery<{ project: { issues: { nodes: LinearIssue[] } } }>(
    apiKey,
    gql,
    { projectId },
  );
  return data.project.issues.nodes;
};

// ── Cycles ─────────────────────────────────────────────────────────────────────

export const getTeamCycles = async (
  apiKey: string,
  teamId: string,
): Promise<LinearCycle[]> => {
  const gql = `
    query TeamCycles($teamId: String!) {
      cycles(
        filter: {
          team: { id: { eq: $teamId } }
          completedAt: { null: true }
        }
        orderBy: createdAt
        first: 20
      ) {
        nodes {
          id name number startsAt endsAt
          team { id name }
        }
      }
    }
  `;
  const data = await linearQuery<{ cycles: { nodes: LinearCycle[] } }>(apiKey, gql, { teamId });
  return data.cycles.nodes;
};

export const getCycleIssues = async (
  apiKey: string,
  cycleId: string,
): Promise<LinearIssue[]> => {
  const gql = `
    query CycleIssues($cycleId: String!) {
      cycle(id: $cycleId) {
        issues(
          filter: { state: { type: { nin: ["completed", "cancelled"] } } }
          first: 100
        ) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    }
  `;
  const data = await linearQuery<{ cycle: { issues: { nodes: LinearIssue[] } } }>(
    apiKey,
    gql,
    { cycleId },
  );
  return data.cycle.issues.nodes;
};

// ── Custom views ───────────────────────────────────────────────────────────────

export const getCustomViews = async (apiKey: string): Promise<LinearCustomView[]> => {
  const gql = `
    query {
      customViews(first: 50) {
        nodes {
          id name description shared
          team { id name }
        }
      }
    }
  `;
  const data = await linearQuery<{ customViews: { nodes: LinearCustomView[] } }>(apiKey, gql);
  return data.customViews.nodes;
};

export const getCustomViewIssues = async (
  apiKey: string,
  viewId: string,
): Promise<LinearIssue[]> => {
  const gql = `
    query CustomViewIssues($viewId: String!) {
      customView(id: $viewId) {
        issues(first: 100) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    }
  `;
  const data = await linearQuery<{ customView: { issues: { nodes: LinearIssue[] } } }>(
    apiKey,
    gql,
    { viewId },
  );
  return data.customView.issues.nodes;
};

// ── Issue detail ───────────────────────────────────────────────────────────────

export interface LinearIssueDetail extends LinearIssue {
  description: string | null;
  assignee: { name: string; avatarUrl?: string | null } | null;
  labels: { name: string; color: string }[];
}

export const getIssueDetail = async (
  apiKey: string,
  issueId: string,
): Promise<LinearIssueDetail> => {
  const gql = `
    query IssueDetail($id: String!) {
      issue(id: $id) {
        ${ISSUE_FIELDS}
        description
        assignee { name avatarUrl }
        labels { nodes { name color } }
      }
    }
  `;
  const data = await linearQuery<{
    issue: LinearIssue & {
      description: string | null;
      assignee: { name: string; avatarUrl?: string | null } | null;
      labels: { nodes: { name: string; color: string }[] };
    };
  }>(apiKey, gql, { id: issueId });

  const { labels, ...rest } = data.issue;
  return { ...rest, labels: labels?.nodes ?? [] };
};

// ── Estimate write-back ────────────────────────────────────────────────────────

export const updateLinearIssueEstimate = async (
  apiKey: string,
  issueId: string,
  estimate: number,
): Promise<void> => {
  const gql = `
    mutation UpdateEstimate($id: String!, $estimate: Float) {
      issueUpdate(id: $id, input: { estimate: $estimate }) {
        success
      }
    }
  `;
  await linearQuery(apiKey, gql, { id: issueId, estimate });
};
