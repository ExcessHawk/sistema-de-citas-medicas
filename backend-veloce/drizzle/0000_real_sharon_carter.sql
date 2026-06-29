CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."condition_type" AS ENUM('allergy', 'chronic_disease', 'surgery', 'medication', 'family_history', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('prescription', 'lab_report', 'imaging', 'referral', 'certificate', 'other');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."follow_up_type" AS ENUM('routine', 'treatment', 'emergency', 'preventive');--> statement-breakpoint
CREATE TYPE "public"."medication_adherence" AS ENUM('excellent', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'doctor', 'admin');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"appointment_date" date NOT NULL,
	"appointment_time" time NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"specialty" varchar(100) NOT NULL,
	"license_number" varchar(50) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"address" text NOT NULL,
	"consultation_fee" numeric(10, 2) NOT NULL,
	"available_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "doctors_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "medical_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"document_type" "document_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"file_path" varchar(500),
	"file_size" integer,
	"mime_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"original_appointment_id" integer,
	"follow_up_type" "follow_up_type" NOT NULL,
	"scheduled_date" date NOT NULL,
	"status" "follow_up_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"treatment_progress" text,
	"medication_adherence" "medication_adherence",
	"side_effects" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"condition_type" "condition_type" NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"severity" "severity",
	"diagnosis_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_medical_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"appointment_id" integer,
	"visit_date" date NOT NULL,
	"symptoms" text,
	"diagnosis" text,
	"treatment" text,
	"medications" text,
	"vital_signs" jsonb,
	"lab_results" text,
	"recommendations" text,
	"next_visit_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_follow_ups" ADD CONSTRAINT "medical_follow_ups_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_follow_ups" ADD CONSTRAINT "medical_follow_ups_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_follow_ups" ADD CONSTRAINT "medical_follow_ups_original_appointment_id_appointments_id_fk" FOREIGN KEY ("original_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_conditions" ADD CONSTRAINT "patient_conditions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_slot_unique" ON "appointments" USING btree ("doctor_id","appointment_date","appointment_time");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient_id" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_doctor_id" ON "appointments" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_date" ON "appointments" USING btree ("appointment_date");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_documents_patient_id" ON "medical_documents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_documents_doctor_id" ON "medical_documents" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_patient_id" ON "medical_follow_ups" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_doctor_id" ON "medical_follow_ups" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_scheduled_date" ON "medical_follow_ups" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_conditions_patient_id" ON "patient_conditions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_conditions_type" ON "patient_conditions" USING btree ("condition_type");--> statement-breakpoint
CREATE INDEX "idx_medical_history_patient_id" ON "patient_medical_history" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_medical_history_doctor_id" ON "patient_medical_history" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_medical_history_visit_date" ON "patient_medical_history" USING btree ("visit_date");