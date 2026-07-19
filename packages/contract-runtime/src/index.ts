import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import * as formatsPluginModule from "ajv-formats";
import { dereference } from "@apidevtools/json-schema-ref-parser";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

export interface ContractFailure {
  location: "path" | "query" | "header" | "body" | "response";
  name: string;
  reason: string;
}

export class ContractValidationError extends Error {
  public constructor(public readonly failures: ContractFailure[]) {
    super("The request or response does not satisfy the internal API contract.");
  }
}

interface CompiledOperation {
  request?: ValidateFunction;
  responses: Map<string, ValidateFunction>;
}

export class OpenApiContract {
  private readonly operations = new Map<string, CompiledOperation>();
  private problemValidator: ValidateFunction | undefined;

  public static async load(filePath: string): Promise<OpenApiContract> {
    const document = await dereference(parse(await readFile(filePath, "utf8"))) as Record<string, unknown>;
    const contract = new OpenApiContract();
    contract.compile(document);
    return contract;
  }

  public validateRequest(operationId: string, input: { params: unknown; query: unknown; headers: unknown; body: unknown }): void {
    const validate = this.operation(operationId).request;
    if (!validate || validate(input)) return;
    throw new ContractValidationError(this.failures(validate, "request"));
  }

  public validateResponse(operationId: string, statusCode: number, payload: unknown): void {
    const validate = this.operation(operationId).responses.get(String(statusCode));
    if (!validate || validate(payload)) return;
    throw new ContractValidationError(this.failures(validate, "response"));
  }

  public validateProblem(payload: unknown): void {
    if (!this.problemValidator || this.problemValidator(payload)) return;
    throw new ContractValidationError(this.failures(this.problemValidator, "response"));
  }

  private compile(document: Record<string, unknown>): void {
    const ajv = new Ajv2020({ allErrors: true, coerceTypes: true, strict: false });
    (formatsPluginModule.default as unknown as (instance: Ajv2020) => void)(ajv);
    const components = document.components as Record<string, Record<string, Record<string, unknown>>>;
    this.problemValidator = ajv.compile(components.schemas!.ProblemDetails!);
    const paths = document.paths as Record<string, Record<string, Record<string, unknown>>>;
    for (const path of Object.values(paths)) {
      for (const operation of Object.values(path)) {
        const operationId = operation.operationId as string | undefined;
        if (!operationId) continue;
        const parameters = (operation.parameters as Array<Record<string, unknown>> | undefined) ?? [];
        const properties: Record<string, Record<string, unknown>> = {
          params: { type: "object", properties: {}, required: [], additionalProperties: true },
          query: { type: "object", properties: {}, required: [], additionalProperties: true },
          headers: { type: "object", properties: {}, required: [], additionalProperties: true }
        };
        for (const parameter of parameters) {
          const location = parameter.in as "path" | "query" | "header";
          const name = location === "header" ? (parameter.name as string).toLowerCase() : parameter.name as string;
          const target = properties[location === "path" ? "params" : location === "query" ? "query" : "headers"]!;
          (target.properties as Record<string, unknown>)[name] = parameter.schema as Record<string, unknown>;
          if (parameter.required) (target.required as string[]).push(name);
        }
        const requestBody = operation.requestBody as Record<string, unknown> | undefined;
        if (requestBody) {
          const content = requestBody.content as Record<string, Record<string, Record<string, unknown>>>;
          properties.body = content["application/json"]?.schema ?? {};
        }
        const requestSchema = { type: "object", properties, required: ["params", "query", "headers", ...(requestBody ? ["body"] : [])], additionalProperties: false };
        const responses = new Map<string, ValidateFunction>();
        for (const [status, response] of Object.entries(operation.responses as Record<string, Record<string, unknown>>)) {
          const content = response.content as Record<string, Record<string, Record<string, unknown>>> | undefined;
          const schema = content?.["application/json"]?.schema;
          if (schema) responses.set(status, ajv.compile(schema));
        }
        this.operations.set(operationId, { request: ajv.compile(requestSchema), responses });
      }
    }
  }

  private operation(operationId: string): CompiledOperation {
    const operation = this.operations.get(operationId);
    if (!operation) throw new Error(`Unknown OpenAPI operation: ${operationId}`);
    return operation;
  }

  private failures(validate: ValidateFunction, scope: "request" | "response"): ContractFailure[] {
    return (validate.errors ?? []).map((error) => {
      const instancePath = error.instancePath.replace(/^\//, "").split("/");
      const location = scope === "response" ? "response" : (instancePath[0] as ContractFailure["location"] | undefined) ?? "body";
      return { location, name: instancePath.at(-1) || error.params.missingProperty || "request", reason: error.message ?? "is invalid" };
    });
  }
}
