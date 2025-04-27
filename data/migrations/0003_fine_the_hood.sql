ALTER TABLE `files` ADD `size` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `files` ADD `is_ephemeral` integer DEFAULT false;