CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"active" boolean DEFAULT true,
	"currency" text DEFAULT 'usd' NOT NULL,
	"unit_amount" integer,
	"interval" text,
	"interval_count" integer DEFAULT 1,
	"type" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "subscription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"stripe_subscription_item_id" text,
	"price_id" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_items_stripe_subscription_item_id_unique" UNIQUE("stripe_subscription_item_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"stripe_price_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"name" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"section_id" uuid,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"selection_start" integer,
	"selection_end" integer,
	"selection_text" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"granted_by_user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"can_invite_others" boolean DEFAULT false,
	"is_accepted" boolean DEFAULT false,
	"accepted_at" timestamp,
	"expires_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"role" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"description" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "suggested_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"section_id" uuid,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"selection_start" integer NOT NULL,
	"selection_end" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp,
	"review_comment" text,
	"applied_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliche_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"text_sample" text NOT NULL,
	"detected_cliches" json,
	"cliche_density" real,
	"replacement_suggestions" json,
	"overall_score" real,
	"analysis_version" text DEFAULT '1.0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "critic_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"humanization_pass_id" uuid NOT NULL,
	"critic_type" text NOT NULL,
	"specificity_score" real,
	"freshness_score" real,
	"performability_score" real,
	"persona_fit_score" real,
	"overall_score" real,
	"suggestions" json,
	"feedback" text,
	"accepted_edits" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cultural_sensitivity_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"text_sample" text NOT NULL,
	"flagged_phrases" json,
	"suggestions" json,
	"risk_level" text NOT NULL,
	"categories" json,
	"review_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "humanization_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"pass_type" text NOT NULL,
	"input_text" text NOT NULL,
	"output_text" text NOT NULL,
	"pass_order" integer NOT NULL,
	"changes" json,
	"metrics" json,
	"processing_time_ms" integer,
	"model_used" text,
	"prompt_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speech_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"order_index" integer NOT NULL,
	"allocated_time_minutes" integer,
	"actual_time_minutes" integer,
	"section_type" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speech_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"label" text,
	"full_text" text NOT NULL,
	"outline" json,
	"metadata" json,
	"word_count" integer,
	"estimated_duration_minutes" integer,
	"is_automatic" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speeches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"occasion" text NOT NULL,
	"audience" text NOT NULL,
	"target_duration_minutes" integer NOT NULL,
	"constraints" text,
	"thesis" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version_id" uuid,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tone_sliders" json,
	"do_list" text,
	"dont_list" text,
	"sample_text" text,
	"is_default" boolean DEFAULT false,
	"is_preset" boolean DEFAULT false,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"avg_sentence_length" real,
	"pos_rhythm" json,
	"metaphor_domains" json,
	"vocabulary_complexity" real,
	"rhetorical_devices" json,
	"embedding" text,
	"is_processed" boolean DEFAULT false,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stylometry_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"text_sample" text,
	"features" json,
	"lexical_diversity" real,
	"syntactic_complexity" real,
	"sentiment_scores" json,
	"readability_scores" json,
	"distance" real,
	"analysis_version" text DEFAULT '1.0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"theme" text,
	"emotion" text,
	"audience_type" text,
	"sensitivity_level" text,
	"tags" text,
	"context" text,
	"is_private" boolean DEFAULT true,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"embedding" text NOT NULL,
	"model" text DEFAULT 'text-embedding-ada-002' NOT NULL,
	"version" text DEFAULT '1.0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_tag_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"is_system_tag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "model_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_run_id" uuid NOT NULL,
	"metric_name" text NOT NULL,
	"value" real NOT NULL,
	"unit" text,
	"threshold" real,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"speech_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"stage" text NOT NULL,
	"prompt_template" text,
	"prompt_version" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"cost" real,
	"latency_ms" integer,
	"success" boolean DEFAULT true,
	"error_message" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speech_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speech_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"draft_created_at" timestamp,
	"first_edit_at" timestamp,
	"finalized_at" timestamp,
	"time_to_first_draft" integer,
	"time_to_final" integer,
	"edit_burden" integer,
	"humanization_passes" integer,
	"final_word_count" integer,
	"target_word_count" integer,
	"accuracy_score" real,
	"quality_score" real,
	"user_satisfaction" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"event_name" text NOT NULL,
	"properties" json,
	"context" json,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_price_id_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_section_id_speech_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."speech_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_edits" ADD CONSTRAINT "suggested_edits_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_edits" ADD CONSTRAINT "suggested_edits_section_id_speech_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."speech_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_edits" ADD CONSTRAINT "suggested_edits_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_edits" ADD CONSTRAINT "suggested_edits_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliche_analysis" ADD CONSTRAINT "cliche_analysis_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critic_feedback" ADD CONSTRAINT "critic_feedback_humanization_pass_id_humanization_passes_id_fk" FOREIGN KEY ("humanization_pass_id") REFERENCES "public"."humanization_passes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultural_sensitivity_checks" ADD CONSTRAINT "cultural_sensitivity_checks_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "humanization_passes" ADD CONSTRAINT "humanization_passes_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_sections" ADD CONSTRAINT "speech_sections_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_versions" ADD CONSTRAINT "speech_versions_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speeches" ADD CONSTRAINT "speeches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_cards" ADD CONSTRAINT "style_cards_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stylometry_data" ADD CONSTRAINT "stylometry_data_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_embeddings" ADD CONSTRAINT "story_embeddings_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_tag_relations" ADD CONSTRAINT "story_tag_relations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_tag_relations" ADD CONSTRAINT "story_tag_relations_tag_id_story_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."story_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_metrics" ADD CONSTRAINT "model_metrics_model_run_id_model_runs_id_fk" FOREIGN KEY ("model_run_id") REFERENCES "public"."model_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_analytics" ADD CONSTRAINT "speech_analytics_speech_id_speeches_id_fk" FOREIGN KEY ("speech_id") REFERENCES "public"."speeches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_analytics" ADD CONSTRAINT "speech_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;