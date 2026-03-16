import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { type StateCreator } from 'zustand/vanilla';

import { createDevtools } from '../middleware/createDevtools';
import { flattenActions } from '../utils/flattenActions';
import type { RbacStoreState } from './initialState';
import { initialState } from './initialState';
import { createRbacSlice, type RbacAction } from './slices/rbac/action';

//  ===============  Aggregate createStoreFn ============ //

export type RbacStore = RbacStoreState & RbacAction;

type RbacStoreAction = RbacAction;

const createStore: StateCreator<RbacStore, [['zustand/devtools', never]]> = (
  ...parameters: Parameters<StateCreator<RbacStore, [['zustand/devtools', never]]>>
) => ({
  ...initialState,
  ...flattenActions<RbacStoreAction>([createRbacSlice(...parameters)]),
});

//  ===============  Implement useStore ============ //

const devtools = createDevtools('rbac');

export const useRbacStore = createWithEqualityFn<RbacStore>()(
  subscribeWithSelector(devtools(createStore)),
  shallow,
);

export const getRbacStoreState = () => useRbacStore.getState();
