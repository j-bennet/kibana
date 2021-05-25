/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getExceptionResponseMockWithoutAutoGeneratedValues } from '../../../../plugins/lists/common/schemas/response/exception_list_schema.mock';
import {
  getCreateExceptionListMinimalSchemaMock,
  getCreateExceptionListMinimalSchemaMockWithoutId,
} from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';

import { deleteAllExceptions, removeExceptionListServerGeneratedProperties } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('create_exception_lists', () => {
    describe('creating exception lists', () => {
      afterEach(async () => {
        await deleteAllExceptions(es);
      });

      it('should create a simple exception list', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const bodyToCompare = removeExceptionListServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getExceptionResponseMockWithoutAutoGeneratedValues());
      });

      it('should create a simple exception list without a list_id', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMockWithoutId())
          .expect(200);

        const bodyToCompare = removeExceptionListServerGeneratedProperties(body);
        const outputtedList: Partial<ExceptionListSchema> = {
          ...getExceptionResponseMockWithoutAutoGeneratedValues(),
          list_id: bodyToCompare.list_id,
        };
        expect(bodyToCompare).to.eql(outputtedList);
      });

      it('should cause a 409 conflict if we attempt to create the same list_id twice', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(409);

        expect(body).to.eql({
          message: 'exception list id: "some-list-id" already exists',
          status_code: 409,
        });
      });
    });
  });
};
