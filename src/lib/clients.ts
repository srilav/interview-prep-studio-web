import { createClient } from "@connectrpc/connect";
import { CatalogService, TaxonomyAdminService } from "../gen/prepstudio/catalog/v1/catalog_pb";
import { LearningService } from "../gen/prepstudio/learning/v1/learning_pb";
import { DiscussionService } from "../gen/prepstudio/discussion/v1/discussion_pb";
import { ProgressService } from "../gen/prepstudio/progress/v1/progress_pb";
import { transport } from "./transport";

export const catalogClient = createClient(CatalogService, transport);
export const taxonomyClient = createClient(TaxonomyAdminService, transport);
export const learningClient = createClient(LearningService, transport);
export const discussionClient = createClient(DiscussionService, transport);
export const progressClient = createClient(ProgressService, transport);
