/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
    buildObjectHierarchy,
    ObjSummary,
    ObjWrap,
    JointData,
    V3,
    lookAt_up_bk,
    FABRIK_IK,
    ResourcesManager,
    IkNode,
    playEndless,
    objPool,
    IkState,
    IV3Readonly
} from 'spark-procedural-animations';
import S from 'Scene';
import R from 'Reactive';

;(async function () {

    // setup model configuration
    const objects: ObjSummary[] = [];
    const nodes = ["Root", "Node1", "Node2", "Node3", "Node4", "Node5", "Node6", "Leaf"];
    const jointsMap: {[key: string]: string} = nodes.reduce((acc, n) => { acc[n] = n; return acc; }, {});
    const joinsData: {[key: string]: JointData} = {
        ["Root"]: new JointData("Root", V3.up, V3.bk, lookAt_up_bk),
        ["Node1"]: new JointData("Node1", V3.up, V3.bk, lookAt_up_bk),
        ["Node2"]: new JointData("Node2", V3.up, V3.bk, lookAt_up_bk),
        ["Node3"]: new JointData("Node3", V3.up, V3.bk, lookAt_up_bk),
        ["Node4"]: new JointData("Node4", V3.up, V3.bk, lookAt_up_bk),
        ["Node5"]: new JointData("Node5", V3.up, V3.bk, lookAt_up_bk),
        ["Node6"]: new JointData("Node6", V3.up, V3.bk, lookAt_up_bk),
        ["Leaf"]: new JointData("Leaf", V3.up, V3.bk, lookAt_up_bk),
    };

    // load all joints
    const resources = new ResourcesManager();
    await resources.loadAllObjectsAsync();
    const objs = resources.objects;
    const jointsGreen: {[key: string]: ObjWrap} = {};
    buildObjectHierarchy("/Device/Camera/Focal Distance/Tentacles/TentacleGreen", true, objs, jointsMap, joinsData, null, jointsGreen);
    const jointsBlack: {[key: string]: ObjWrap} = {};
    buildObjectHierarchy("/Device/Camera/Focal Distance/Tentacles/TentacleBlack", true, objs, jointsMap, joinsData, null, jointsBlack);
    const jointsPink: {[key: string]: ObjWrap} = {};
    buildObjectHierarchy("/Device/Camera/Focal Distance/Tentacles/TentaclePink", true, objs, jointsMap, joinsData, null, jointsPink);

    // load control object
    const [controlGreen,poleGreen,controlBlack,controlPink] =
        await Promise.all([
            S.root.findFirst('ControlGreen'),
            S.root.findFirst('PoleTargetGreen'),
            S.root.findFirst('ControlBlack'),
            S.root.findFirst('ControlPink')
        ]);

    const greenPos = V3.createPermanent().updateAsPositionFromReactive_(controlGreen.transform);
    const polePos = V3.createPermanent().updateAsPositionFromReactive_(poleGreen.transform);

    const blackPos = V3.createPermanent().updateAsPositionFromReactive_(controlBlack.transform);

    const pinkPos = V3.createPermanent().updateAsPositionFromReactive_(controlPink.transform);


    function getTipUpFunc(s: IkState): IV3Readonly {
        const dir = s.dirFirstToTip;
        const upDir = s.root.obj.rot.mulV3(s.root.obj.v.up);
        const fwDir = s.root.obj.rot.mulV3(s.root.obj.v.fw);
        const bkDir = fwDir.mulBy(-1);
        const dotUp = dir.dot(upDir);
        const rootUp = upDir.rotTo01(dotUp > 0 ? bkDir : fwDir, Math.abs(dotUp));
        const left = rootUp.cross(dir).ensureNormalized;
        const right = left.mulBy(-1);
        return right.cross(dir).ensureNormalized;
    }

    // create Green IK chain (with pole target)
    const ikGreen =
        new FABRIK_IK('GREEN', jointsGreen['MODEL'], {
            nodes: nodes.map(n => new IkNode(jointsGreen[n])),
            allowFallBackAlg: false,
            startIndex: 1,
            stickToInitial: false,
            extendTipBy: 0,
            isRight: false,
            numberIterations: 8,
            getPoleTargetPosition: d => V3.create(),
            getTipUp: getTipUpFunc
          });

    // run green
    playEndless(() => {
        ikGreen.worldPos = greenPos;
        ikGreen.pole.worldPos = polePos;
        ikGreen.solveIK();
    }, objPool);

    // create Black IK chain (NO pole target)
    const ikBlack =
        new FABRIK_IK('BLACK', jointsBlack['MODEL'], {
            nodes: nodes.map(n => new IkNode(jointsBlack[n])),
            allowFallBackAlg: false,
            startIndex: 1,
            stickToInitial: false,
            extendTipBy: 0,
            isRight: false,
            numberIterations: 8,
            getTipUp: getTipUpFunc
        });

    // run green
    playEndless(() => {
        ikBlack.worldPos = blackPos;
        ikBlack.solveIK();
    }, objPool);

    // create Black IK chain (NO pole target, stick to initial)
    const ikPink =
        new FABRIK_IK('PINK', jointsPink['MODEL'], {
            nodes: nodes.map(n => new IkNode(jointsPink[n])),
            allowFallBackAlg: false,
            startIndex: 1,
            stickToInitial: true,
            extendTipBy: 0,
            isRight: false,
            numberIterations: 8,
            getTipUp: getTipUpFunc
        });

    // run green
    playEndless(() => {
        ikPink.worldPos = pinkPos;
        ikPink.solveIK();
    }, objPool);

})();
