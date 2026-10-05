/**
 * /similarity — Vector Similarity Tester route.
 *
 * Thin route wrapper: sets page metadata (title/description, kept honest by
 * pulling the model/dimensions/task-type from lib/contract/similarity rather
 * than hardcoding them) and renders SimilarityClient, which owns all
 * interactive state.
 */

import type { Metadata } from "next";
import SimilarityClient from "./SimilarityClient";
import {
  EMBEDDING_MODEL,
  DEFAULT_DIMENSIONS,
  DEFAULT_TASK_TYPE,
} from "@/lib/contract/similarity";

export const metadata: Metadata = {
  title: "Vector Similarity Tester | DFO Prototypes",
  description: `Test query strings against StatVar names using Google's ${EMBEDDING_MODEL} embedding model (${DEFAULT_DIMENSIONS}d, ${DEFAULT_TASK_TYPE})`,
};

export default function SimilarityPage() {
  return <SimilarityClient />;
}
