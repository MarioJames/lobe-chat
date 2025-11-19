import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { createDevtools } from '../middleware/createDevtools';
import { RbacStoreState, initialState } from './initialState';
import { RbacAction, createRbacSlice } from './slices/rbac';

//  ===============  聚合 createStoreFn ============ //

export interface RbacStore extends RbacStoreState, RbacAction {}

const createStore: StateCreator<RbacStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createRbacSlice(...parameters),
});

//  ===============  实装 useStore ============ //
const devtools = createDevtools('rbac');

export const useRbacStore = createWithEqualityFn<RbacStore>()(devtools(createStore), shallow);
