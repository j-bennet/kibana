/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type { MappingsApiResponse } from '../lib/autocomplete_entities/types';
import { API_BASE_PATH } from '../../common/constants';
import {
  Alias,
  DataStream,
  Mapping,
  LegacyTemplate,
  IndexTemplate,
  ComponentTemplate,
} from '../lib/autocomplete_entities';
import { DevToolsSettings, Settings } from './settings';

export class AutocompleteInfo {
  public readonly alias = new Alias();
  public readonly mapping = new Mapping();
  public readonly dataStream = new DataStream();
  public readonly legacyTemplate = new LegacyTemplate();
  public readonly indexTemplate = new IndexTemplate();
  public readonly componentTemplate = new ComponentTemplate();
  private http!: HttpSetup;
  private pollTimeoutId: ReturnType<typeof setTimeout> | undefined;

  public setup(http: HttpSetup) {
    this.http = http;
  }

  public getEntityProvider(
    type: string,
    context: { indices: string[]; types: string[] } = { indices: [], types: [] }
  ) {
    switch (type) {
      case 'indices':
        const includeAliases = true;
        const collaborator = this.mapping;
        return () => this.alias.getIndices(includeAliases, collaborator);
      case 'fields':
        return this.mapping.getMappings(context.indices, context.types);
      case 'indexTemplates':
        return () => this.indexTemplate.getTemplates();
      case 'componentTemplates':
        return () => this.componentTemplate.getTemplates();
      case 'legacyTemplates':
        return () => this.legacyTemplate.getTemplates();
      case 'dataStreams':
        return () => this.dataStream.getDataStreams();
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }

  public retrieve(settings: Settings, settingsToRetrieve: DevToolsSettings['autocomplete']) {
    this.clearSubscriptions();
    this.http
      .get<MappingsApiResponse>(`${API_BASE_PATH}/autocomplete_entities`, {
        query: { ...settingsToRetrieve },
      })
      .then((data) => {
        this.load(data);
        // Schedule next request.
        this.pollTimeoutId = setTimeout(() => {
          // This looks strange/inefficient, but it ensures correct behavior because we don't want to send
          // a scheduled request if the user turns off polling.
          if (settings.getPolling()) {
            this.retrieve(settings, settings.getAutocomplete());
          }
        }, settings.getPollInterval());
      });
  }

  public clearSubscriptions() {
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
    }
  }

  private load(data: MappingsApiResponse) {
    this.mapping.loadMappings(data.mappings);
    const collaborator = this.mapping;
    this.alias.loadAliases(data.aliases, collaborator);
    this.indexTemplate.loadTemplates(data.indexTemplates);
    this.componentTemplate.loadTemplates(data.componentTemplates);
    this.legacyTemplate.loadTemplates(data.legacyTemplates);
    this.dataStream.loadDataStreams(data.dataStreams);
  }

  public clear() {
    this.alias.clearAliases();
    this.mapping.clearMappings();
    this.dataStream.clearDataStreams();
    this.legacyTemplate.clearTemplates();
    this.indexTemplate.clearTemplates();
    this.componentTemplate.clearTemplates();
  }
}

export const [getAutocompleteInfo, setAutocompleteInfo] =
  createGetterSetter<AutocompleteInfo>('AutocompleteInfo');
