export interface BitbucketUser {
  display_name: string;
  account_id: string;
  nickname: string;
}

export interface BitbucketRepository {
  slug: string;
  name: string;
  description: string;
  is_private: boolean;
  updated_on: string;
  mainbranch?: { name: string };
}

export interface BitbucketBranch {
  name: string;
  repository?: { full_name: string };
}

export interface BitbucketPR {
  id: number;
  title: string;
  description: string;
  state: 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED';
  author: BitbucketUser;
  source: { branch: BitbucketBranch; repository: { full_name: string } };
  destination: { branch: BitbucketBranch; repository: { full_name: string } };
  reviewers: BitbucketUser[];
  participants: Array<{ user: BitbucketUser; role: string; approved: boolean; state: string }>;
  created_on: string;
  updated_on: string;
  comment_count: number;
  task_count: number;
  close_source_branch: boolean;
  links: { html: { href: string }; self: { href: string } };
}

export interface BitbucketComment {
  id: number;
  content: { raw: string; markup: string; html: string };
  created_on: string;
  updated_on: string;
  author: BitbucketUser;
  inline?: {
    path: string;
    from: number | null;
    to: number | null;
  };
  deleted: boolean;
}

export interface PaginatedResponse<T> {
  values: T[];
  next?: string;
  pagelen: number;
  size?: number;
  page?: number;
}

export interface MergeResult {
  id: number;
  state: string;
  merge_commit?: { hash: string };
}
