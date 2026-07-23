import type {
  FeedbackLabel,
  FeedbackTargetType,
} from './entities/operator-feedback.entity';

export type CreateFeedbackInput = {
  targetType: FeedbackTargetType;
  targetId: string;
  label: FeedbackLabel;
  actor?: string;
};

export type FeedbackResponse = {
  id: string;
  targetType: FeedbackTargetType;
  targetId: string;
  label: FeedbackLabel;
  promptVersion: string | null;
  knowledgeVersion: string | null;
  source: string;
  actor: string;
  createdAt: Date;
};
