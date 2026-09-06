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


            this.overlay =
                document.querySelector(
                    '#ar-overlay'
                );


            this.instruction =
                document.querySelector(
                    '#ar-instruction'
                );


            this.controlPanel =
                document.querySelector(
                    '#ar-control-panel'
                );


            this.rotationSlider =
                document.querySelector(
                    '#ar-rotation-slider'
                );


            this.rotationValue =
                document.querySelector(
                    '#ar-rotation-value'
                );


            this.repositionButton =
                document.querySelector(
                    '#ar-reposition'
                );


            this.distanceValue =
                document.querySelector(
                    '#ar-distance-value'
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
            // PLACEMENT DATA
            // =================================================

            this.lastHitPosition =
                new THREE.Vector3();


            this.lastHitQuaternion =
                new THREE.Quaternion();


            // Once placed, this is the fixed world position.

            this.lockedPosition =
                new THREE.Vector3();


            // Rotation around Y.

            this.rotationDegrees =
                0;


            this.rotationRadians =
                0;


            // =================================================
            // FIXED AR SCALE
            // =================================================
            //
            // IMPORTANT:
            //
            // This stays CONSTANT after placement.
            //
            // That is what produces real-world behavior:
            //
            // closer camera = larger apparent object
            // farther camera = smaller apparent object
            //
            // =================================================

            this.arScale =
                0.30;


            // =================================================
            // SAVE NORMAL NON-AR TRANSFORM
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

                    // A-Frame may take a short moment to
                    // update the ar-mode state.

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


            // =================================================
            // ROTATION SLIDER
            // =================================================

            if (
                this.rotationSlider
            ) {

                this.rotationSlider.addEventListener(
                    'input',
                    (event) => {

                        const value =
                            Number(
                                event.target.value
                            );


                        this.setRotation(
                            value
                        );

                    }
                );

            }


            // =================================================
            // REPOSITION BUTTON
            // =================================================

            if (
                this.repositionButton
            ) {

                this.repositionButton.addEventListener(
                    'click',
                    (event) => {

                        event.preventDefault();

                        event.stopPropagation();


                        this.resetPlacement();

                    }
                );

            }


            // =================================================
            // DOM OVERLAY INPUT PROTECTION
            // =================================================
            //
            // Prevent interactions with the overlay controls
            // from also becoming XR "select" placement events.
            //
            // =================================================

            const interactiveElements =
                [
                    this.rotationSlider,
                    this.repositionButton
                ];


            interactiveElements.forEach(
                (element) => {

                    if (
                        !element
                    ) {

                        return;

                    }


                    element.addEventListener(
                        'beforexrselect',
                        (event) => {

                            event.preventDefault();

                        }
                    );


                    element.addEventListener(
                        'pointerdown',
                        (event) => {

                            event.stopPropagation();

                        }
                    );


                    element.addEventListener(
                        'pointerup',
                        (event) => {

                            event.stopPropagation();

                        }
                    );


                    element.addEventListener(
                        'touchstart',
                        (event) => {

                            event.stopPropagation();

                        },
                        {
                            passive: true
                        }
                    );


                    element.addEventListener(
                        'touchend',
                        (event) => {

                            event.stopPropagation();

                        },
                        {
                            passive: true
                        }
                    );

                }
            );


            // =================================================
            // INITIAL UI VALUES
            // =================================================

            this.updateRotationLabel();

            this.updateControlState();

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
                    'AR session is unavailable.'
                );

                return;

            }


            console.log(
                'AR mode started.'
            );


            this.session =
                session;


            this.arActive =
                true;


            this.placed =
                false;


            this.hasHit =
                false;


            this.rotationDegrees =
                0;


            this.rotationRadians =
                0;


            if (
                this.rotationSlider
            ) {

                this.rotationSlider.value =
                    '0';

            }


            this.updateRotationLabel();


            // =================================================
            // DIAGNOSTIC: DOM OVERLAY
            // =================================================

            if (
                session.domOverlayState
            ) {

                console.log(
                    'WebXR DOM overlay active:',
                    session.domOverlayState.type
                );

            }

            else {

                console.warn(
                    'WebXR DOM overlay was not granted.'
                );

            }


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
            // HIDE NORMAL VIRTUAL FLOOR
            // =================================================

            if (
                this.floor
            ) {

                this.floor
                    .object3D
                    .visible =
                        false;

            }


            // =================================================
            // HIDE MODEL BEFORE PLACEMENT
            // =================================================

            this.cell
                .object3D
                .visible =
                    false;


            if (
                this.reticle
            ) {

                this.reticle
                    .object3D
                    .visible =
                        false;

            }


            // =================================================
            // SHOW DOM OVERLAY
            // =================================================

            if (
                this.overlay
            ) {

                this.overlay.style.display =
                    'block';

            }


            this.updateControlState();


            this.setInstruction(
                'Scan a floor or table slowly.'
            );


            try {

                // =================================================
                // VIEWER REFERENCE SPACE
                // =================================================

                this.viewerSpace =
                    await session
                        .requestReferenceSpace(
                            'viewer'
                        );


                // =================================================
                // WORLD / LOCAL REFERENCE SPACE
                // =================================================

                this.referenceSpace =
                    await session
                        .requestReferenceSpace(
                            'local'
                        );


                // =================================================
                // HIT TEST SOURCE
                // =================================================

                if (
                    typeof session
                        .requestHitTestSource
                    !==
                    'function'
                ) {

                    throw new Error(
                        'WebXR hit-test API unavailable.'
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


                console.log(
                    'AR hit testing initialized.'
                );


                // =================================================
                // TAP TO PLACE
                // =================================================

                this.onSelect =
                    () => {

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

            }

            catch (
                error
            ) {

                console.error(
                    'AR initialization error:',
                    error
                );


                this.setInstruction(
                    'Surface detection initialization failed.'
                );

            }

        },


        // =====================================================
        // MAIN FRAME LOOP
        // =====================================================

        tick: function () {

            if (
                !this.arActive
            ) {

                return;

            }


            // =================================================
            // MODEL HAS ALREADY BEEN PLACED
            // =================================================

            if (
                this.placed
            ) {

                // -------------------------------------------------
                // EXPLICIT WORLD-SPACE LOCK
                // -------------------------------------------------
                //
                // Keep reapplying the placement transform.
                //
                // Camera translation must NOT move the model.
                //
                // -------------------------------------------------

                this.cell
                    .object3D
                    .position
                    .copy(
                        this.lockedPosition
                    );


                this.cell
                    .object3D
                    .rotation
                    .set(
                        0,
                        this.rotationRadians,
                        0
                    );


                this.cell
                    .object3D
                    .scale
                    .set(
                        this.arScale,
                        this.arScale,
                        this.arScale
                    );


                // -------------------------------------------------
                // SHOW REAL CAMERA-TO-MODEL DISTANCE
                // -------------------------------------------------

                this.updateDistanceDisplay();


                return;

            }


            // =================================================
            // SEARCHING FOR PLACEMENT SURFACE
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
            // NO SURFACE
            // =================================================

            if (
                results.length === 0
            ) {

                this.hasHit =
                    false;


                if (
                    this.reticle
                ) {

                    this.reticle
                        .object3D
                        .visible =
                            false;

                }


                this.setInstruction(
                    'Searching for a surface...'
                );


                return;

            }


            // =================================================
            // SURFACE DETECTED
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


            const temporaryScale =
                new THREE.Vector3();


            matrix.decompose(

                this.lastHitPosition,

                this.lastHitQuaternion,

                temporaryScale

            );


            // =================================================
            // RETICLE
            // =================================================

            if (
                this.reticle
            ) {

                this.reticle
                    .object3D
                    .visible =
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


            this.setInstruction(
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


            // =================================================
            // STORE THE WORLD POSITION PERMANENTLY
            // =================================================

            this.lockedPosition.copy(
                this.lastHitPosition
            );


            // =================================================
            // APPLY WORLD POSITION
            // =================================================

            this.cell
                .object3D
                .position
                .copy(
                    this.lockedPosition
                );


            // =================================================
            // APPLY FIXED PHYSICAL SCALE
            // =================================================

            this.cell
                .object3D
                .scale
                .set(
                    this.arScale,
                    this.arScale,
                    this.arScale
                );


            // =================================================
            // INITIAL ROTATION
            // =================================================

            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    this.rotationRadians,
                    0
                );


            this.cell
                .object3D
                .visible =
                    true;


            this.placed =
                true;


            if (
                this.reticle
            ) {

                this.reticle
                    .object3D
                    .visible =
                        false;

            }


            this.updateControlState();


            this.setInstruction(
                'Placed - walk around the model.'
            );


            console.log(
                'AR model locked at:',
                this.lockedPosition
            );

        },


        // =====================================================
        // SET ROTATION FROM SLIDER
        // =====================================================

        setRotation: function (
            degrees
        ) {

            this.rotationDegrees =
                THREE.MathUtils.clamp(
                    degrees,
                    0,
                    360
                );


            this.rotationRadians =
                THREE.MathUtils.degToRad(
                    this.rotationDegrees
                );


            if (
                this.placed
            ) {

                this.cell
                    .object3D
                    .rotation
                    .set(
                        0,
                        this.rotationRadians,
                        0
                    );

            }


            this.updateRotationLabel();

        },


        // =====================================================
        // UPDATE ROTATION LABEL
        // =====================================================

        updateRotationLabel: function () {

            if (
                !this.rotationValue
            ) {

                return;

            }


            this.rotationValue.textContent =
                Math.round(
                    this.rotationDegrees
                )
                +
                '°';

        },


        // =====================================================
        // DISTANCE DISPLAY
        // =====================================================

        updateDistanceDisplay: function () {

            if (
                !this.distanceValue
                ||
                !this.placed
            ) {

                return;

            }


            const camera =
                document.querySelector(
                    '#main-camera'
                );


            if (
                !camera
            ) {

                return;

            }


            const cameraPosition =
                new THREE.Vector3();


            camera
                .object3D
                .getWorldPosition(
                    cameraPosition
                );


            const distance =
                cameraPosition.distanceTo(
                    this.lockedPosition
                );


            this.distanceValue.textContent =
                distance.toFixed(
                    2
                )
                +
                ' m';

        },


        // =====================================================
        // REPOSITION
        // =====================================================

        resetPlacement: function () {

            if (
                !this.arActive
            ) {

                return;

            }


            this.placed =
                false;


            this.hasHit =
                false;


            this.cell
                .object3D
                .visible =
                    false;


            if (
                this.reticle
            ) {

                this.reticle
                    .object3D
                    .visible =
                        false;

            }


            if (
                this.distanceValue
            ) {

                this.distanceValue.textContent =
                    '--';

            }


            this.updateControlState();


            this.setInstruction(
                'Scan another floor or table surface.'
            );

        },


        // =====================================================
        // CONTROL AVAILABILITY
        // =====================================================

        updateControlState: function () {

            if (
                this.rotationSlider
            ) {

                this.rotationSlider.disabled =
                    !this.placed;

            }


            if (
                this.repositionButton
            ) {

                this.repositionButton.disabled =
                    !this.placed;

            }

        },


        // =====================================================
        // SET INSTRUCTION
        // =====================================================

        setInstruction: function (
            text
        ) {

            if (
                this.instruction
            ) {

                this.instruction.textContent =
                    text;

            }

        },


        // =====================================================
        // LEAVE AR
        // =====================================================

        stopAR: function () {

            console.log(
                'Leaving AR mode.'
            );


            // =================================================
            // REMOVE XR SELECT EVENT
            // =================================================

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


            // =================================================
            // CANCEL HIT TEST
            // =================================================

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


            // =================================================
            // RESET INTERNAL STATE
            // =================================================

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


            this.rotationDegrees =
                0;


            this.rotationRadians =
                0;


            // =================================================
            // HIDE AR OVERLAY
            // =================================================

            if (
                this.overlay
            ) {

                this.overlay.style.display =
                    'none';

            }


            if (
                this.reticle
            ) {

                this.reticle
                    .object3D
                    .visible =
                        false;

            }


            // =================================================
            // RESTORE FLOOR
            // =================================================

            if (
                this.floor
            ) {

                this.floor
                    .object3D
                    .visible =
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
            // RESTORE INDUSTRIAL CELL
            // =================================================

            this.cell
                .object3D
                .visible =
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


            if (
                this.rotationSlider
            ) {

                this.rotationSlider.value =
                    '0';

            }


            if (
                this.distanceValue
            ) {

                this.distanceValue.textContent =
                    '--';

            }


            this.updateRotationLabel();

            this.updateControlState();

        }

    }
);