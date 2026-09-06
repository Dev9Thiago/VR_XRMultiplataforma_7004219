AFRAME.registerComponent(
    'ar-placement',
    {

        // =====================================================
        // INITIALIZATION
        // =====================================================

        init: function () {

            this.sceneEl =
                this.el;


            this.cell =
                document.querySelector(
                    '#industrial-cell'
                );


            this.floor =
                document.querySelector(
                    '#virtual-floor'
                );


            this.reticle =
                document.querySelector(
                    '#ar-reticle'
                );


            this.statusText =
                document.querySelector(
                    '#ar-status-text'
                );


            this.arControls =
                document.querySelector(
                    '#ar-xr-controls'
                );


            // =================================================
            // XR STATE
            // =================================================

            this.session =
                null;


            this.viewerSpace =
                null;


            this.referenceSpace =
                null;


            this.hitTestSource =
                null;


            this.arActive =
                false;


            this.placed =
                false;


            this.hasHit =
                false;


            // =================================================
            // SURFACE HIT DATA
            // =================================================

            this.lastHitPosition =
                new THREE.Vector3();


            this.lastHitQuaternion =
                new THREE.Quaternion();


            // =================================================
            // MODEL PLACEMENT DATA
            // =================================================

            this.lockedPosition =
                new THREE.Vector3();


            this.rotationDegrees =
                0;


            this.rotationRadians =
                0;


            // =================================================
            // DISTANCE-BASED SCALING
            // =================================================

            // Initial AR scale at placement.

            this.baseARScale =
                0.30;


            // Distance between camera and model at
            // the instant the model is placed.

            this.referenceDistance =
                null;


            // Scaling limits.

            this.minimumScaleMultiplier =
                0.55;


            this.maximumScaleMultiplier =
                1.75;


            // Current scale multiplier.

            this.currentScaleMultiplier =
                1.0;


            // =================================================
            // SAVE NORMAL SCENE TRANSFORM
            // =================================================

            this.normalPosition =
                this.cell
                    .object3D
                    .position
                    .clone();


            this.normalQuaternion =
                this.cell
                    .object3D
                    .quaternion
                    .clone();


            this.normalScale =
                this.cell
                    .object3D
                    .scale
                    .clone();


            // =================================================
            // ENTER XR
            // =================================================

            this.sceneEl.addEventListener(
                'enter-vr',
                () => {

                    setTimeout(
                        () => {

                            if (
                                this.sceneEl.is(
                                    'ar-mode'
                                )
                            ) {

                                this.startAR();

                            }

                        },
                        120
                    );

                }
            );


            // =================================================
            // EXIT XR
            // =================================================

            this.sceneEl.addEventListener(
                'exit-vr',
                () => {

                    if (
                        this.arActive
                    ) {

                        this.stopAR();

                    }

                }
            );

        },


        // =====================================================
        // START AR
        // =====================================================

        startAR: async function () {

            if (
                this.arActive
            ) {

                return;

            }


            const session =
                this.sceneEl.xrSession
                ||
                this.sceneEl
                    .renderer
                    .xr
                    .getSession();


            if (
                !session
            ) {

                console.error(
                    'AR session not available.'
                );

                return;

            }


            this.session =
                session;


            this.arActive =
                true;


            this.placed =
                false;


            this.hasHit =
                false;


            this.referenceDistance =
                null;


            this.currentScaleMultiplier =
                1;


            this.rotationDegrees =
                0;


            this.rotationRadians =
                0;


            // =================================================
            // CAMERA PASSTHROUGH
            // =================================================

            this.sceneEl.removeAttribute(
                'background'
            );


            if (
                this.sceneEl.renderer
            ) {

                this.sceneEl
                    .renderer
                    .setClearColor(
                        0x000000,
                        0
                    );

            }


            // =================================================
            // HIDE VIRTUAL FLOOR
            // =================================================

            if (
                this.floor
            ) {

                this.floor.object3D.visible =
                    false;

            }


            // =================================================
            // HIDE CELL UNTIL PLACED
            // =================================================

            this.cell.object3D.visible =
                false;


            if (
                this.reticle
            ) {

                this.reticle.object3D.visible =
                    false;

            }


            // =================================================
            // SHOW XR CONTROLS
            // =================================================

            if (
                this.arControls
            ) {

                this.arControls.object3D.visible =
                    true;

            }


            this.setStatus(
                'Searching for a surface...'
            );


            try {

                // =================================================
                // REFERENCE SPACES
                // =================================================

                this.viewerSpace =
                    await session
                        .requestReferenceSpace(
                            'viewer'
                        );


                this.referenceSpace =
                    await session
                        .requestReferenceSpace(
                            'local'
                        );


                // =================================================
                // HIT TEST
                // =================================================

                if (
                    typeof session.requestHitTestSource
                    !==
                    'function'
                ) {

                    throw new Error(
                        'WebXR hit-test is unavailable.'
                    );

                }


                this.hitTestSource =
                    await session
                        .requestHitTestSource(
                            {
                                space:
                                    this.viewerSpace
                            }
                        );


                // =================================================
                // SCREEN TAP
                // =================================================

                this.onSelect =
                    (event) => {

                        // Let AR controls consume their own select
                        // events before placement is attempted.

                        const controlsComponent =
                            this.arControls
                                ?.components[
                                    'ar-controls'
                                ];


                        if (
                            controlsComponent
                            &&
                            controlsComponent.handleXRSelect(
                                event
                            )
                        ) {

                            return;

                        }


                        if (
                            this.hasHit
                            &&
                            !this.placed
                        ) {

                            this.placeCell();

                        }

                    };


                session.addEventListener(
                    'select',
                    this.onSelect
                );


                console.log(
                    'AR surface detection initialized.'
                );

            }

            catch (
                error
            ) {

                console.error(
                    'AR initialization error:',
                    error
                );


                this.setStatus(
                    'Surface detection unavailable.'
                );

            }

        },


        // =====================================================
        // MAIN UPDATE
        // =====================================================

        tick: function () {

            if (
                !this.arActive
            ) {

                return;

            }


            // =================================================
            // MODEL ALREADY PLACED
            // =================================================

            if (
                this.placed
            ) {

                this.updatePlacedModel();

                return;

            }


            // =================================================
            // SURFACE SEARCH
            // =================================================

            if (
                !this.hitTestSource
                ||
                !this.referenceSpace
            ) {

                return;

            }


            const frame =
                this.sceneEl.frame;


            if (
                !frame
            ) {

                return;

            }


            let results;


            try {

                results =
                    frame.getHitTestResults(
                        this.hitTestSource
                    );

            }

            catch (
                error
            ) {

                console.error(
                    'AR hit-test frame error:',
                    error
                );

                return;

            }


            // =================================================
            // NOTHING DETECTED
            // =================================================

            if (
                results.length === 0
            ) {

                this.hasHit =
                    false;


                if (
                    this.reticle
                ) {

                    this.reticle.object3D.visible =
                        false;

                }


                this.setStatus(
                    'Searching for a surface...'
                );


                return;

            }


            // =================================================
            // VALID SURFACE
            // =================================================

            const pose =
                results[0]
                    .getPose(
                        this.referenceSpace
                    );


            if (
                !pose
            ) {

                return;

            }


            this.hasHit =
                true;


            const matrix =
                new THREE.Matrix4();


            matrix.fromArray(
                pose.transform.matrix
            );


            const tempScale =
                new THREE.Vector3();


            matrix.decompose(

                this.lastHitPosition,

                this.lastHitQuaternion,

                tempScale

            );


            // =================================================
            // RETICLE
            // =================================================

            if (
                this.reticle
            ) {

                this.reticle.object3D.visible =
                    true;


                this.reticle
                    .object3D
                    .position
                    .copy(
                        this.lastHitPosition
                    );


                this.reticle
                    .object3D
                    .quaternion
                    .copy(
                        this.lastHitQuaternion
                    );

            }


            this.setStatus(
                'Surface detected - tap to place.'
            );

        },


        // =====================================================
        // PLACE MODEL
        // =====================================================

        placeCell: function () {

            if (
                !this.arActive
                ||
                !this.hasHit
                ||
                this.placed
            ) {

                return;

            }


            this.lockedPosition.copy(
                this.lastHitPosition
            );


            this.cell
                .object3D
                .position
                .copy(
                    this.lockedPosition
                );


            this.rotationDegrees =
                0;


            this.rotationRadians =
                0;


            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    0,
                    0
                );


            this.cell
                .object3D
                .scale
                .set(
                    this.baseARScale,
                    this.baseARScale,
                    this.baseARScale
                );


            this.cell.object3D.visible =
                true;


            this.placed =
                true;


            if (
                this.reticle
            ) {

                this.reticle.object3D.visible =
                    false;

            }


            // =================================================
            // REFERENCE DISTANCE
            // =================================================

            const cameraPosition =
                this.getCameraWorldPosition();


            this.referenceDistance =
                cameraPosition.distanceTo(
                    this.lockedPosition
                );


            if (
                this.referenceDistance <
                0.05
            ) {

                this.referenceDistance =
                    0.05;

            }


            // =================================================
            // ENABLE CONTROLS
            // =================================================

            const controlsComponent =
                this.arControls
                    ?.components[
                        'ar-controls'
                    ];


            if (
                controlsComponent
            ) {

                controlsComponent.setEnabled(
                    true
                );


                controlsComponent.setSliderValue(
                    0
                );

            }


            this.setStatus(
                'Placed - move the phone or adjust rotation.'
            );


            console.log(
                'AR cell placed.'
            );

        },


        // =====================================================
        // UPDATE PLACED MODEL
        // =====================================================

        updatePlacedModel: function () {

            const cameraPosition =
                this.getCameraWorldPosition();


            const currentDistance =
                cameraPosition.distanceTo(
                    this.lockedPosition
                );


            if (
                !this.referenceDistance
                ||
                currentDistance <
                0.01
            ) {

                return;

            }


            // =================================================
            // DYNAMIC SCALE
            // =================================================
            //
            // Moving closer:
            //
            // referenceDistance / currentDistance > 1
            //
            // -> model grows.
            //
            // Moving away:
            //
            // referenceDistance / currentDistance < 1
            //
            // -> model shrinks.
            //
            // =================================================

            let multiplier =
                this.referenceDistance
                /
                currentDistance;


            multiplier =
                THREE.MathUtils.clamp(

                    multiplier,

                    this.minimumScaleMultiplier,

                    this.maximumScaleMultiplier

                );


            this.currentScaleMultiplier =
                multiplier;


            const scale =
                this.baseARScale
                *
                multiplier;


            // =================================================
            // LOCK WORLD POSITION
            // =================================================

            this.cell
                .object3D
                .position
                .copy(
                    this.lockedPosition
                );


            // =================================================
            // APPLY ROTATION
            // =================================================

            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    this.rotationRadians,
                    0
                );


            // =================================================
            // APPLY DYNAMIC SCALE
            // =================================================

            this.cell
                .object3D
                .scale
                .set(
                    scale,
                    scale,
                    scale
                );


            // =================================================
            // UPDATE CONTROL INFORMATION
            // =================================================

            const controlsComponent =
                this.arControls
                    ?.components[
                        'ar-controls'
                    ];


            if (
                controlsComponent
            ) {

                controlsComponent.updateDistance(
                    currentDistance,
                    multiplier
                );

            }

        },


        // =====================================================
        // SET ROTATION
        // =====================================================

        setRotationDegrees: function (
            degrees
        ) {

            if (
                !this.placed
            ) {

                return;

            }


            degrees =
                THREE.MathUtils.clamp(
                    degrees,
                    0,
                    360
                );


            this.rotationDegrees =
                degrees;


            this.rotationRadians =
                THREE.MathUtils.degToRad(
                    degrees
                );


            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    this.rotationRadians,
                    0
                );

        },


        // =====================================================
        // REPOSITION
        // =====================================================

        reposition: function () {

            if (
                !this.arActive
            ) {

                return;

            }


            this.placed =
                false;


            this.hasHit =
                false;


            this.referenceDistance =
                null;


            this.currentScaleMultiplier =
                1;


            this.cell.object3D.visible =
                false;


            if (
                this.reticle
            ) {

                this.reticle.object3D.visible =
                    false;

            }


            const controlsComponent =
                this.arControls
                    ?.components[
                        'ar-controls'
                    ];


            if (
                controlsComponent
            ) {

                controlsComponent.setEnabled(
                    false
                );

            }


            this.setStatus(
                'Searching for a new surface...'
            );

        },


        // =====================================================
        // CAMERA POSITION
        // =====================================================

        getCameraWorldPosition: function () {

            const camera =
                document.querySelector(
                    '#main-camera'
                );


            const position =
                new THREE.Vector3();


            if (
                camera
            ) {

                camera
                    .object3D
                    .getWorldPosition(
                        position
                    );

            }


            return position;

        },


        // =====================================================
        // STATUS TEXT
        // =====================================================

        setStatus: function (
            text
        ) {

            if (
                !this.statusText
            ) {

                return;

            }


            this.statusText.setAttribute(
                'value',
                text
            );

        },


        // =====================================================
        // STOP AR
        // =====================================================

        stopAR: function () {

            if (
                this.session
                &&
                this.onSelect
            ) {

                this.session.removeEventListener(
                    'select',
                    this.onSelect
                );

            }


            if (
                this.hitTestSource
            ) {

                try {

                    this.hitTestSource.cancel();

                }

                catch (
                    error
                ) {

                    console.warn(
                        'Hit-test cleanup warning:',
                        error
                    );

                }

            }


            this.session =
                null;


            this.viewerSpace =
                null;


            this.referenceSpace =
                null;


            this.hitTestSource =
                null;


            this.onSelect =
                null;


            this.arActive =
                false;


            this.placed =
                false;


            this.hasHit =
                false;


            this.referenceDistance =
                null;


            this.currentScaleMultiplier =
                1;


            // =================================================
            // HIDE AR UI
            // =================================================

            if (
                this.reticle
            ) {

                this.reticle.object3D.visible =
                    false;

            }


            if (
                this.arControls
            ) {

                this.arControls.object3D.visible =
                    false;

            }


            // =================================================
            // RESTORE FLOOR
            // =================================================

            if (
                this.floor
            ) {

                this.floor.object3D.visible =
                    true;

            }


            // =================================================
            // RESTORE BACKGROUND
            // =================================================

            this.sceneEl.setAttribute(
                'background',
                'color',
                '#ECECEC'
            );


            // =================================================
            // RESTORE CELL
            // =================================================

            this.cell.object3D.visible =
                true;


            this.cell
                .object3D
                .position
                .copy(
                    this.normalPosition
                );


            this.cell
                .object3D
                .quaternion
                .copy(
                    this.normalQuaternion
                );


            this.cell
                .object3D
                .scale
                .copy(
                    this.normalScale
                );

        }

    }
);