// @generated from the client-contract IR; do not edit.
//
// `project` operations of package `wamn_control`.

import type { FieldMap, OperationRoute, Outcome, Transport } from "../runtime/wire";
import { reviveOutcome, toWire } from "../runtime/wire";

/** Input for `wamn-control:project/activate@0.9.0`. */
export interface ProjectActivateRequest {
  /** `text` */
  requestId: string;
  /** `object` */
  value: ProjectActivateRequestValue;
}

export interface ProjectActivateRequestValue {
  /** `text` */
  project: string;
}

/** What `wamn-control:project/activate@0.9.0` calls its input members. */
export const PROJECT_ACTIVATE_REQUEST_FIELDS: FieldMap = {
  "request_id": "requestId",
  "value": {
    member: "value",
    fields: {
      "project": "project",
    },
  },
};

/** Result of `wamn-control:project/activate@0.9.0`. */
export interface ProjectActivateResult {
  /** `text` */
  readonly project: string;
  /** `text` */
  readonly status: string;
}

/** What `wamn-control:project/activate@0.9.0` calls its result members. */
export const PROJECT_ACTIVATE_RESULT_FIELDS: FieldMap = {
  "project": "project",
  "status": "status",
};

/**
 * Where the release publishes `wamn-control:project/activate@0.9.0`.
 *
 * Method and template only. The host and base URL are the application's
 * deployment configuration, not this release's facts.
 */
export const PROJECT_ACTIVATE_ROUTE: OperationRoute = {
  operation: "wamn-control:project/activate@0.9.0",
  method: "POST",
  template: "/wamn_control/project/activate",
  contract: {
    resultClass: "one",
    partialSchema: null,
    errors: [
      { literal: "application_write_incomplete", required: ["environment"], sources: ["transaction_invariant"], text: "The application rows stopped at this environment. The completed environments are done." },
      { literal: "invalid_input", required: ["field"], sources: ["malformed_input"], text: null },
      { literal: "permission_denied", required: ["operation"], sources: ["permission_denied"], text: null },
      { literal: "project_not_found", required: ["field"], sources: ["transaction_invariant"], text: "This project is not a project of the org." },
    ],
    replay: null,
    direct: true,
    type: "command",
    transaction: "explicit_per_input",
    reads: [],
    writes: null,
  },
};

/** Invoke `wamn-control:project/activate@0.9.0` through a transport the application supplies. */
export async function activate(
  transport: Transport,
  items: readonly ProjectActivateRequest[],
): Promise<Outcome<ProjectActivateResult>> {
  return reviveOutcome<ProjectActivateResult>(
    await transport.invoke({
      ...PROJECT_ACTIVATE_ROUTE,
      items: items.map((item) => toWire(item, PROJECT_ACTIVATE_REQUEST_FIELDS)),
    }),
    PROJECT_ACTIVATE_RESULT_FIELDS,
  );
}

/** Input for `wamn-control:project/create@0.9.0`. */
export interface ProjectCreateRequest {
  /** `text` */
  requestId: string;
  /** `object` */
  value: ProjectCreateRequestValue;
}

export interface ProjectCreateRequestValue {
  /** `text` */
  project: string;
}

/** What `wamn-control:project/create@0.9.0` calls its input members. */
export const PROJECT_CREATE_REQUEST_FIELDS: FieldMap = {
  "request_id": "requestId",
  "value": {
    member: "value",
    fields: {
      "project": "project",
    },
  },
};

/** Result of `wamn-control:project/create@0.9.0`. */
export interface ProjectCreateResult {
  /** `text` */
  readonly project: string;
}

/** What `wamn-control:project/create@0.9.0` calls its result members. */
export const PROJECT_CREATE_RESULT_FIELDS: FieldMap = {
  "project": "project",
};

/**
 * Where the release publishes `wamn-control:project/create@0.9.0`.
 *
 * Method and template only. The host and base URL are the application's
 * deployment configuration, not this release's facts.
 */
export const PROJECT_CREATE_ROUTE: OperationRoute = {
  operation: "wamn-control:project/create@0.9.0",
  method: "POST",
  template: "/wamn_control/project/create",
  contract: {
    resultClass: "one",
    partialSchema: null,
    errors: [
      { literal: "invalid_input", required: ["field"], sources: ["malformed_input"], text: null },
      { literal: "permission_denied", required: ["operation"], sources: ["permission_denied"], text: null },
      { literal: "project_exists", required: ["field"], sources: ["transaction_invariant"], text: "This project is a project of the org already." },
    ],
    replay: null,
    direct: true,
    type: "command",
    transaction: "explicit_per_input",
    reads: [],
    writes: null,
  },
};

/** Invoke `wamn-control:project/create@0.9.0` through a transport the application supplies. */
export async function create(
  transport: Transport,
  items: readonly ProjectCreateRequest[],
): Promise<Outcome<ProjectCreateResult>> {
  return reviveOutcome<ProjectCreateResult>(
    await transport.invoke({
      ...PROJECT_CREATE_ROUTE,
      items: items.map((item) => toWire(item, PROJECT_CREATE_REQUEST_FIELDS)),
    }),
    PROJECT_CREATE_RESULT_FIELDS,
  );
}

/** Input for `wamn-control:project/inactivate@0.9.0`. */
export interface ProjectInactivateRequest {
  /** `text` */
  requestId: string;
  /** `object` */
  value: ProjectInactivateRequestValue;
}

export interface ProjectInactivateRequestValue {
  /** `text` */
  project: string;
}

/** What `wamn-control:project/inactivate@0.9.0` calls its input members. */
export const PROJECT_INACTIVATE_REQUEST_FIELDS: FieldMap = {
  "request_id": "requestId",
  "value": {
    member: "value",
    fields: {
      "project": "project",
    },
  },
};

/** Result of `wamn-control:project/inactivate@0.9.0`. */
export interface ProjectInactivateResult {
  /** `text` */
  readonly project: string;
  /** `text` */
  readonly status: string;
}

/** What `wamn-control:project/inactivate@0.9.0` calls its result members. */
export const PROJECT_INACTIVATE_RESULT_FIELDS: FieldMap = {
  "project": "project",
  "status": "status",
};

/**
 * Where the release publishes `wamn-control:project/inactivate@0.9.0`.
 *
 * Method and template only. The host and base URL are the application's
 * deployment configuration, not this release's facts.
 */
export const PROJECT_INACTIVATE_ROUTE: OperationRoute = {
  operation: "wamn-control:project/inactivate@0.9.0",
  method: "POST",
  template: "/wamn_control/project/inactivate",
  contract: {
    resultClass: "one",
    partialSchema: null,
    errors: [
      { literal: "application_write_incomplete", required: ["environment"], sources: ["transaction_invariant"], text: "The application rows stopped at this environment. The completed environments are done." },
      { literal: "invalid_input", required: ["field"], sources: ["malformed_input"], text: null },
      { literal: "permission_denied", required: ["operation"], sources: ["permission_denied"], text: null },
      { literal: "project_not_found", required: ["field"], sources: ["transaction_invariant"], text: "This project is not a project of the org." },
    ],
    replay: null,
    direct: true,
    type: "command",
    transaction: "explicit_per_input",
    reads: [],
    writes: null,
  },
};

/** Invoke `wamn-control:project/inactivate@0.9.0` through a transport the application supplies. */
export async function inactivate(
  transport: Transport,
  items: readonly ProjectInactivateRequest[],
): Promise<Outcome<ProjectInactivateResult>> {
  return reviveOutcome<ProjectInactivateResult>(
    await transport.invoke({
      ...PROJECT_INACTIVATE_ROUTE,
      items: items.map((item) => toWire(item, PROJECT_INACTIVATE_REQUEST_FIELDS)),
    }),
    PROJECT_INACTIVATE_RESULT_FIELDS,
  );
}

/** Input for `wamn-control:project/list@0.9.0`. */
export interface ProjectListRequest {
  /** `text`, omittable */
  cursor?: string;
  /** `int32`, omittable */
  limit?: number;
}

/** What `wamn-control:project/list@0.9.0` calls its input members. */
export const PROJECT_LIST_REQUEST_FIELDS: FieldMap = {
  "cursor": "cursor",
  "limit": "limit",
};

/** Result of `wamn-control:project/list@0.9.0`. */
export interface ProjectListResult {
  /** `text` */
  readonly nextCursor: string | null;
  /** `array` */
  readonly projects: readonly ProjectListResultProjects[];
  /** `int32` */
  readonly total: number | null;
}

export interface ProjectListResultProjects {
  /** `text` */
  readonly name: string;
  /** `text` */
  readonly state: "active" | "inactive";
}

/** What `wamn-control:project/list@0.9.0` calls its result members. */
export const PROJECT_LIST_RESULT_FIELDS: FieldMap = {
  "next_cursor": "nextCursor",
  "projects": {
    member: "projects",
    fields: {
      "name": "name",
      "state": "state",
    },
  },
  "total": "total",
};

/**
 * Where the release publishes `wamn-control:project/list@0.9.0`.
 *
 * Method and template only. The host and base URL are the application's
 * deployment configuration, not this release's facts.
 */
export const PROJECT_LIST_ROUTE: OperationRoute = {
  operation: "wamn-control:project/list@0.9.0",
  method: "GET",
  template: "/wamn_control/project/list",
  contract: {
    resultClass: "one",
    partialSchema: null,
    errors: [
      { literal: "invalid_input", required: ["field"], sources: ["malformed_input"], text: null },
      { literal: "permission_denied", required: ["operation"], sources: ["permission_denied"], text: null },
    ],
    replay: null,
    direct: true,
    type: "get",
    transaction: "implicit",
    reads: [],
    writes: null,
  },
};

/** Invoke `wamn-control:project/list@0.9.0` through a transport the application supplies. */
export async function list(
  transport: Transport,
  items: readonly ProjectListRequest[],
): Promise<Outcome<ProjectListResult>> {
  return reviveOutcome<ProjectListResult>(
    await transport.invoke({
      ...PROJECT_LIST_ROUTE,
      items: items.map((item) => toWire(item, PROJECT_LIST_REQUEST_FIELDS)),
    }),
    PROJECT_LIST_RESULT_FIELDS,
  );
}
