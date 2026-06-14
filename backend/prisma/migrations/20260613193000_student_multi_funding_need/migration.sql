ALTER TABLE `student_research_interests`
  ADD COLUMN `funding_need_new` JSON NULL;

UPDATE `student_research_interests`
SET `funding_need_new` = JSON_ARRAY(`funding_need`);

ALTER TABLE `student_research_interests`
  DROP COLUMN `funding_need`,
  CHANGE COLUMN `funding_need_new` `funding_need` JSON NOT NULL;
