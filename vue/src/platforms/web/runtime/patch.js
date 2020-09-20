/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// 操作class、attr、style、事件等钩子函数
const modules = platformModules.concat(baseModules)

// nodeOps中定义了操作DOM的方法
export const patch: Function = createPatchFunction({ nodeOps, modules })
