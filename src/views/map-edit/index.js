import React from 'react';
import { withRouter } from 'react-router';
import viewarApi from 'viewar-api';
import {
  compose,
  withState,
  withHandlers,
  withProps,
  lifecycle,
} from 'recompose';
import waitForUiUpdate from '../../utils/wait-for-ui-update';
import authManager from '../../services/auth-manager';
import appState from '../../services/app-state';
import storage from '../../services/storage';
import graphController from '../../services/graph-controller';
import poiPlacement from '../../services/poi-placement';
import sceneDirector from '../../services/scene-director';
import config from '../../services/config';
import waypointPlacement from '../../services/waypoint-placement';
import {
  MODE_NONE,
  MODE_WAYPOINT_PLACEMENT,
  MODE_POI_PLACEMENT,
} from '../../services/scene-director/modes';

import render from './template.jsx';

export const goTo = ({ history }) => route => history.push(route);

export const saveProject = ({
  setDeleteVisible,
  graphController,
  waypointPlacement,
  showToast,
  history,
  viewarApi: { coreInterface },
  storage,
  userId,
  showDialog,
  hideDialog,
  appState,
  setUndoVisible,
}) => async () => {
  await showDialog('Please wait...');
  await waypointPlacement.stop();
  await storage.activeProject.save();
  await waypointPlacement.start();
  setUndoVisible(false);
  await hideDialog();
  setDeleteVisible(!!graphController.selectedWaypoint);
  showToast('AdminProjectSaved', 2000);
};

export const goBack = ({
  config,
  history,
  appState,
  viewarApi: { coreInterface },
}) => async () => {
  config.app.showFeatures &&
    (await coreInterface.call('setPointCloudVisibility', false, false));
  history.push(appState.editBackPath || '/map-view');
};

export default compose(
  withRouter,
  withState('waitDialogText', 'setWaitDialogText', ''),
  withState('toastText', 'setToastText', ''),
  withState('project', 'setProject', null),
  withState('editVisible', 'setEditVisible', ''),
  withState('poi', 'setPoi', ''),
  withState('saveVisible', 'setSaveVisible', false),
  withState('undoVisible', 'setUndoVisible', false),
  withState('placePoiVisible', 'setPlacePoiVisible', false),
  withState('trackingLost', 'setTrackingLost', false),
  withState('helpVisible', 'setHelpVisible', false),
  withState('helpTimeout', 'setHelpTimeout', false),
  withState('deleteVisible', 'setDeleteVisible', false),
  withProps({
    config,
    viewarApi,
    waypointPlacement,
    appState,
    storage,
    poiPlacement,
    graphController,
    sceneDirector,
    userId: authManager.user.username,
  }),
  withHandlers({
    showEdit: ({ setEditVisible }) => () => setEditVisible(true),
    hideEdit: ({ setEditVisible }) => () => setEditVisible(false),
    cancelEdit: ({ setEditVisible }) => () => setEditVisible(false),
    showDialog: ({ setWaitDialogText }) => async text => {
      setWaitDialogText(text);
      await waitForUiUpdate();
    },
    hideDialog: ({ setWaitDialogText }) => async () => {
      setWaitDialogText('');
      await waitForUiUpdate();
    },
    showToast: ({ setToastText }) => (text, timeout) => {
      setToastText(text);
      if (timeout) {
        setTimeout(() => setToastText(''), timeout);
      }
    },
    hideToast: ({ setToastText }) => () => setToastText(''),
    toggleHelp: ({
      helpVisible,
      setHelpVisible,
      helpTimeout,
      setHelpTimeout,
    }) => visible => {
      const visibility = typeof visible === 'boolean' ? visible : !helpVisible;
      setHelpVisible(visibility);

      if (visibility) {
        clearTimeout(helpTimeout);
        setHelpTimeout(setTimeout(() => setHelpVisible(false), 5000));
      } else {
        clearTimeout(helpTimeout);
      }
    },
    updateTracking: ({
      setTrackingLost,
      viewarApi: { trackers },
    }) => async () => {
      const tracker = Object.values(trackers)[0];

      let tracking = true;
      if (tracker.loadTrackingMap) {
        tracking = tracker.targets.filter(
          target => target.type === 'map' && target.tracked
        ).length;
      }

      setTrackingLost(!tracking);

      if (tracking) {
        await sceneDirector.setMode(MODE_WAYPOINT_PLACEMENT);
      } else {
        await sceneDirector.setMode(MODE_NONE);
      }
    },
    deleteWaypoint: ({
      setDeleteVisible,
      setUndoVisible,
      graphController,
    }) => () => {
      graphController.removeObject(graphController.selectedWaypoint);
      setUndoVisible(graphController.canUndo);
      setDeleteVisible(!!graphController.selectedWaypoint);
    },
  }),
  withHandlers({
    goTo,
    goBack,
    saveProject,
    recordWaypoint: ({
      setDeleteVisible,
      setPlacePoiVisible,
      setSaveVisible,
      graphController,
      setUndoVisible,
      sceneDirector,
      showDialog,
      hideDialog,
      viewarApi: { sceneManager },
      waypointPlacement,
      appState,
    }) => async () => {
      await showDialog('Please wait...');

      const initial = graphController.waypoints.length;
      await waypointPlacement.addWaypoint();
      const actual = graphController.waypoints.length;

      if (actual > initial) {
        setPlacePoiVisible(true);
      }
      setUndoVisible(graphController.canUndo);
      await sceneManager.clearSelection();
      setSaveVisible(Object.keys(graphController.waypoints).length);
      await hideDialog();

      setDeleteVisible(!!graphController.selectedWaypoint);
    },
    recordPoi: ({ history }) => async () => {
      history.push('/poi-capture');
    },
    undo: ({
      setPlacePoiVisible,
      setDeleteVisible,
      setSaveVisible,
      graphController,
      setUndoVisible,
      appState,
    }) => async () => {
      await graphController.undo();
      setUndoVisible(graphController.canUndo);
      setSaveVisible(Object.keys(graphController.waypoints).length);
      setPlacePoiVisible(Object.keys(graphController.waypoints).length);
      setDeleteVisible(!!graphController.selectedWaypoint);
    },
    resetTracking: ({ history }) => () => history.push('/init-tracker'),
  }),
  lifecycle({
    async componentDidMount() {
      const {
        config,
        setDeleteVisible,
        setPlacePoiVisible,
        setSaveVisible,
        sceneDirector,
        viewarApi: { trackers, coreInterface },
        storage,
        setProject,
        graphController,
        setUndoVisible,
        updateTracking,
      } = this.props;

      if (storage.activeProject) {
        setProject(storage.activeProject);
        setSaveVisible(Object.keys(graphController.waypoints).length);
        setPlacePoiVisible(Object.keys(graphController.waypoints).length);
      }

      setUndoVisible(graphController.canUndo);
      setDeleteVisible(!!graphController.selectedWaypoint);

      await sceneDirector.start(MODE_WAYPOINT_PLACEMENT);

      const tracker = Object.values(trackers)[0];
      if (tracker) {
        tracker.on('trackingTargetStatusChanged', updateTracking);
        if (storage.activeProject.trackingMap) {
          await tracker.reset();
          await storage.activeProject.loadTrackingMap();
        } else {
          config.app.showFeatures &&
            coreInterface.call('setPointCloudVisibility', true, true);
        }
        updateTracking();
      }
    },
    async componentWillUnmount() {
      const {
        waypointPlacement,
        viewarApi: { trackers, coreInterface },
        helpTimeout,
        updateTracking,
      } = this.props;

      const tracker = Object.values(trackers)[0];
      tracker && tracker.off('trackingTargetStatusChanged', updateTracking);

      clearTimeout(helpTimeout);
      await waypointPlacement.stop();
    },
  })
)(render);