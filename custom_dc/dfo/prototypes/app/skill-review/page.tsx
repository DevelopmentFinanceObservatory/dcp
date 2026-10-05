/**
 * /skill-review: Skill Comparison Review route.
 *
 * Thin route wrapper: sets page metadata and renders SkillReviewClient, which
 * owns all interactive state. Follows app/similarity/page.tsx for shape.
 */

import type { Metadata } from "next";
import SkillReviewClient from "./SkillReviewClient";

export const metadata: Metadata = {
  title: "Skill Review | DFO Prototypes",
  description:
    "Compare two answers to a development-finance question, one generated with the DFO skills and one without, and rate which is more useful and correct.",
};

export default function SkillReviewPage() {
  return <SkillReviewClient />;
}
