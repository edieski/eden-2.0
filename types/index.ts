export type LifePillar =
  | "health"
  | "mind"
  | "finances"
  | "purpose"
  | "relationships"
  | "spirituality"
  | "home";

export interface Milestone {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  pillar: LifePillar;
  phase: number;
  target_date: string | null;
  status: "not_started" | "in_progress" | "completed";
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  milestone_id: string | null;
  title: string;
  pillar: LifePillar;
  frequency: "daily" | "weekdays" | "weekends" | "custom";
  custom_days: number[] | null;
  color: string;
  icon: string | null;
  order_index: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  note: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  type: "morning" | "evening" | "custom";
  items: RoutineItem[];
  is_active: boolean;
  created_at: string;
}

export interface RoutineItem {
  id: string;
  title: string;
  duration_minutes: number | null;
  completed?: boolean;
}

export interface RoutineLog {
  id: string;
  routine_id: string;
  user_id: string;
  date: string;
  completed_items: string[];
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  hunger_before: number | null;
  hunger_after: number | null;
  mood: string | null;
  notes: string | null;
  dbt_prompt: string | null;
  dbt_reflection: string | null;
  created_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start: string;
  day_of_week: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description: string | null;
  recipe_url: string | null;
  source?: "manual" | "scan";
  image_url?: string | null;
  created_at: string;
}

export interface MealIngredient {
  id: string;
  user_id: string;
  meal_plan_id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  created_at: string;
}

export interface GroceryItem {
  id: string;
  user_id: string;
  week_start: string;
  name: string;
  quantity: string | null;
  category: "produce" | "protein" | "dairy" | "pantry" | "frozen" | "bakery" | "other";
  checked: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  pillar: LifePillar | null;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface VisionBoardItem {
  id: string;
  user_id: string;
  type: "image" | "text" | "affirmation";
  content: string;
  url: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  bg_color: string | null;
  text_color: string | null;
  created_at: string;
}

export interface CleaningTask {
  id: string;
  user_id: string;
  room: string;
  title: string;
  description: string | null;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  duration_minutes: number;
  is_minimum_viable: boolean;
  order_index: number;
  parent_id: string | null;
  created_at: string;
}

export interface CleaningLog {
  id: string;
  task_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface CleaningWheel {
  id: string;
  user_id: string;
  name: string;
  task_ids: string[];
  created_at: string;
}

export interface DisciplineReview {
  id: string;
  user_id: string;
  week_start: string;
  wins: string;
  struggles: string;
  intentions: string;
  pillar_ratings: Record<LifePillar, number>;
  overall_mood: number;
  created_at: string;
}

export interface ChibiState {
  mood: "thriving" | "happy" | "okay" | "sad" | "sleeping";
  outfit: "default" | "ballet" | "cozy" | "study" | "clean";
  level: number;
  xp: number;
  streak: number;
  name: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  chibi_name: string;
  chibi_outfit: string;
  chibi_level: number;
  chibi_xp: number;
  onboarded: boolean;
  created_at: string;
}
