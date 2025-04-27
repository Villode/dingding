PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` text PRIMARY KEY NOT NULL,
	`object_id` text NOT NULL,
	`filename` text,
	`type` text,
	`hash` text NOT NULL,
	`code` text NOT NULL,
	`size` integer DEFAULT 0,
	`is_ephemeral` integer DEFAULT false,
	`is_encrypted` integer DEFAULT false,
	`due_date` integer NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "object_id", "filename", "type", "hash", "code", "size", "is_ephemeral", "is_encrypted", "due_date", "created_at") SELECT "id", "object_id", "filename", "type", "hash", "code", "size", "is_ephemeral", "is_encrypted", "due_date", "created_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `files_code_unique` ON `files` (`code`);