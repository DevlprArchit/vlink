export interface SkillItem {
  name: string;
  level: number;
  verified: boolean;
  endorsements: number;
  endorsedBy?: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  repoUrl?: string;
  liveUrl?: string;
  highlights?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  campus: string;
  department: string;
  graduationYear: string;
  headline: string;
  bio: string;
  targetRole: string;
  verifiedCampusBadge: boolean;
  avatarColor: string;
  skills: SkillItem[];
  projects: ProjectItem[];
  interests: string[];
  readinessScore: number;
  readinessTier: string;
  readinessDimensions: Record<string, number>;
  connections: string[];
  following: string[];
  followedCompanies: string[];
  joinedGroups: string[];
  education: string;
}

export type PublicProfile = Omit<UserProfile, "passwordHash">;

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHeadline: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  type: "post" | "project" | "article";
  title?: string;
  content: string;
  imageUrl?: string;
  projectRef?: {
    title: string;
    techStack: string[];
    repoUrl?: string;
  };
  groupId?: string;
  tags: string[];
  likes: string[];
  reposts: string[];
  comments: PostComment[];
  createdAt: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  category: "Campus" | "Technology" | "Builders" | "Placements";
  campus: string;
  description: string;
  memberIds: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title?: string;
  isGroup: boolean;
  participantIds: string[];
  messages: ChatMessage[];
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  website: string;
  description: string;
  verified: boolean;
  followerIds: string[];
}

export interface JobPosting {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  roleType: "Internship" | "Full-Time" | "Part-Time";
  location: string;
  remote: boolean;
  stipendOrSalary: string;
  requiredSkills: string[];
  description: string;
  postedAt: string;
}

export type ApplicationStatus = "applied" | "shortlisted" | "interview" | "offer" | "rejected";

export interface JobApplication {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  matchScore: number;
  coverNote?: string;
  appliedAt: string;
  updatedAt: string;
}

export interface RoadmapMilestone {
  id: string;
  phase: string;
  title: string;
  description: string;
  skills_covered: string[];
  estimated_hours: number;
  resources: { title: string; url: string }[];
  deliverable: string;
  completed: boolean;
}

export interface UserRoadmap {
  userId: string;
  targetRole: string;
  estimatedWeeks: number;
  milestones: RoadmapMilestone[];
  updatedAt: string;
}

export interface CertificationItem {
  id: string;
  title: string;
  provider: string;
  category: string;
  duration: string;
  url: string;
  skills: string[];
  isFree: boolean;
}

export interface UserCertificationProgress {
  userId: string;
  certId: string;
  progress: number;
  completed: boolean;
  updatedAt: string;
}

export interface SkillAssessmentRecord {
  id: string;
  userId: string;
  targetRole: string;
  overallScore: number;
  tier: string;
  dimensions: Record<string, number>;
  missingCoreSkills: string[];
  recommendations: string[];
  completedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  category: "connection" | "message" | "application" | "milestone" | "endorsement";
  title: string;
  body: string;
  read: boolean;
  link: string;
  createdAt: string;
}

export interface VLinkDatabase {
  users: UserProfile[];
  posts: Post[];
  groups: CommunityGroup[];
  conversations: Conversation[];
  companies: Company[];
  jobs: JobPosting[];
  applications: JobApplication[];
  roadmaps: UserRoadmap[];
  certifications: CertificationItem[];
  certProgress: UserCertificationProgress[];
  assessments: SkillAssessmentRecord[];
  notifications: NotificationItem[];
}
