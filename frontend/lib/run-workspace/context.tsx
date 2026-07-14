"use client";

import {getStrictContext} from "@/lib/get-strict-context";
import type {RunWorkspaceValue} from "./types";

const [RunWorkspaceProviderInner, useRunWorkspace] = getStrictContext<RunWorkspaceValue>("RunWorkspace");

export {RunWorkspaceProviderInner, useRunWorkspace};
