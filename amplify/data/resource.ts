import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  CrewMember: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      role: a.string().required(),
      email: a.string().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  PerformanceRecord: a
    .model({
      id: a.id().required(),
      crewMemberId: a.id().required(),
      date: a.date().required(),
      metrics: a.json().required(),
      notes: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  ChatSession: a
    .model({
      id: a.id().required(),
      userId: a.id().required(),
      messages: a.json().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
