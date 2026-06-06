-- Run on Render Postgres (Connect → psql) to remove demo users and learning data.
-- Keeps admin@multivate.com.ng only. API startup will repair that admin if needed.

DELETE FROM payment_audit_logs;
DELETE FROM payments;
DELETE FROM video_watch_history;
DELETE FROM lesson_resources;
DELETE FROM lessons;
DELETE FROM course_sections;
DELETE FROM course_audit_logs;
DELETE FROM course_reviews;
DELETE FROM enrollments;
DELETE FROM notifications;
DELETE FROM inbox_messages;
DELETE FROM mfa_otp_challenges;
DELETE FROM student_learning_profiles;
DELETE FROM instructor_teaching_profiles;
DELETE FROM courses;

DELETE FROM users WHERE email <> 'admin@multivate.com.ng';
