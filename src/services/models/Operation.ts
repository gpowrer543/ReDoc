import { action, observable } from 'mobx';

import { IMenuItem } from '../MenuStore';
import { GroupModel } from './Group.model';
import { SecurityRequirementModel } from './SecurityRequirement';

import { OpenAPIExternalDocumentation, OpenAPIServer } from '../../types';

import {
  getOperationSummary,
  getStatusCodeType,
  isStatusCode,
  JsonPointer,
  memoize,
  mergeParams,
  normalizeServers,
  sortByRequired,
} from '../../utils';
import { ContentItemModel, ExtendedOpenAPIOperation } from '../MenuBuilder';
import { OpenAPIParser } from '../OpenAPIParser';
import { RedocNormalizedOptions } from '../RedocNormalizedOptions';
import { FieldModel } from './Field';
import { RequestBodyModel } from './RequestBody';
import { ResponseModel } from './Response';
import { CodeSample } from './types';
/**
 * Operation model ready to be used by components
 */
export class OperationModel implements IMenuItem {
  //#region IMenuItem fields
  id: string;
  absoluteIdx?: number;
  name: string;
  description?: string;
  type = 'operation' as 'operation';

  parent?: GroupModel;
  externalDocs?: OpenAPIExternalDocumentation;
  items: ContentItemModel[] = [];

  depth: number;

  @observable ready?: boolean = true;
  @observable active: boolean = false;
  //#endregion

  pointer: string;
  operationId?: string;
  httpVerb: string;
  deprecated: boolean;
  path: string;
  servers: OpenAPIServer[];
  security: SecurityRequirementModel[];
  codeSamples: CodeSample[];

  constructor(
    private parser: OpenAPIParser,
    private operationSpec: ExtendedOpenAPIOperation,
    parent: GroupModel | undefined,
    private options: RedocNormalizedOptions,
  ) {
    this.pointer = JsonPointer.compile(['paths', operationSpec.pathName, operationSpec.httpVerb]);

    this.id =
      operationSpec.operationId !== undefined
        ? 'operation/' + operationSpec.operationId
        : parent !== undefined
          ? parent.id + this.pointer
          : this.pointer;

    this.name = getOperationSummary(operationSpec);
    this.description = operationSpec.description;
    this.parent = parent;
    this.externalDocs = operationSpec.externalDocs;

    this.deprecated = !!operationSpec.deprecated;
    this.httpVerb = operationSpec.httpVerb;
    this.deprecated = !!operationSpec.deprecated;
    this.operationId = operationSpec.operationId;
    this.codeSamples = operationSpec['x-code-samples'] || [];
    this.path = operationSpec.pathName;
    this.servers = normalizeServers(
      parser.specUrl,
      operationSpec.servers || parser.spec.servers || [],
    );

    this.security = (operationSpec.security || parser.spec.security || []).map(
      security => new SecurityRequirementModel(security, parser),
    );
  }

  /**
   * set operation as active (used by side menu)
   */
  @action
  activate() {
    this.active = true;
  }

  /**
   * set operation as inactive (used by side menu)
   */
  @action
  deactivate() {
    this.active = false;
  }

  @memoize
  get requestBody() {
    return (
      this.operationSpec.requestBody &&
      new RequestBodyModel(this.parser, this.operationSpec.requestBody, this.options)
    );
  }

  @memoize
  get parameters() {
    const _parameters = mergeParams(
      this.parser,
      this.operationSpec.pathParameters,
      this.operationSpec.parameters,
      // TODO: fix pointer
    ).map(paramOrRef => new FieldModel(this.parser, paramOrRef, this.pointer, this.options));

    if (this.options.requiredPropsFirst) {
      sortByRequired(_parameters);
    }
    return _parameters;
  }

  @memoize
  get responses() {
    let hasSuccessResponses = false;
    return Object.keys(this.operationSpec.responses || [])
      .filter(code => {
        if (code === 'default') {
          return true;
        }

        if (getStatusCodeType(code) === 'success') {
          hasSuccessResponses = true;
        }

        return isStatusCode(code);
      }) // filter out other props (e.g. x-props)
      .map(code => {
        return new ResponseModel(
          this.parser,
          code,
          hasSuccessResponses,
          this.operationSpec.responses[code],
          this.options,
        );
      });
  }
}
