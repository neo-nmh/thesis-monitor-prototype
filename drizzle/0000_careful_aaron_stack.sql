CREATE TABLE `research_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`thesis_id` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text NOT NULL,
	`reserved` real NOT NULL,
	`estimated_cost` real,
	`result` text
);
--> statement-breakpoint
CREATE TABLE `theses` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
