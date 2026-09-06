// =============================================================
// AR SURFACE PLACEMENT
// =============================================================
//
// Features:
//
// 1. Detects AR mode.
// 2. Enables camera passthrough.
// 3. Hides the virtual desktop floor in AR.
// 4. Detects real surfaces using WebXR hit testing.
// 5. Shows a reticle on valid detected surfaces.
// 6. Tap to place the industrial cell.
// 7. Keeps a FIXED world scale so the model behaves like
//    a real-world object:
//       - move phone closer -> model appears larger
//       - move phone farther -> model appears smaller
// 8. Allows rotation around the vertical axis.
// 9. Allows repositioning.
// 10. Restores the normal desktop / mobile / VR scene on exit.
//
// =============================================================


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


            this.rotateButton =
                document.querySelector(
                    '#ar-rotate'
                );


            this.repositionButton =
                document.querySelector(
                    '#ar-reposition'
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
            // AR MODEL SETTINGS
            // =================================================

            // Fixed real-world scale.
            //
            // Once the object is placed this value does not
            // change automatically or through UI controls.
            //
            // The apparent size changes naturally when the
            // user physically moves the smartphone.

            this.arScale =
                0.30;


            // Current rotation around world Y-axis.

            this.rotationY =
                0;


            // Rotation step per button press.

            this.rotationStep =
                THREE.MathUtils.degToRad(
                    45
                );


            // =================================================
            // LAST VALID HIT
            // =================================================

            this.lastHitPosition =
                new THREE.Vector3();


            this.lastHitQuaternion =
                new THREE.Quaternion();


            // =================================================
            // SAVE ORIGINAL NON-AR TRANSFORM
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

                    // A-Frame may need a brief moment before
                    // ar-mode becomes available.

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
            // ROTATE BUTTON
            // =================================================

            if (
                this.rotateButton
            ) {

                this.rotateButton.addEventListener(
                    'click',
                    () => {

                        this.rotatePlacedModel();

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
                    () => {

                        this.resetPlacement();

                    }
                );

            }


            // Prevent AR UI buttons from also triggering
            // a WebXR placement select event.

            if (
                this.overlay
            ) {

                this.overlay.addEventListener(
                    'beforexrselect',
                    (event) => {

                        event.preventDefault();

                    }
                );

            }

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


            this.rotationY =
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

                this.floor
                    .object3D
                    .visible =
                        false;

            }


            // =================================================
            // HIDE CELL UNTIL PLACED
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
            // SHOW AR OVERLAY
            // =================================================

            if (
                this.overlay
            ) {

                this.overlay
                    .style
                    .display =
                        'flex';

            }


            this.setInstruction(
                'Move the phone slowly and point at a floor or table.'
            );


            try {

                // =================================================
                // VIEWER SPACE
                // =================================================

                this.viewerSpace =
                    await session
                        .requestReferenceSpace(
                            'viewer'
                        );


                // =================================================
                // LOCAL SPACE
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
                        'WebXR hit testing is not supported.'
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
                    'AR hit-test source created.'
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
                    'Surface detection could not be initialized.'
                );

            }

        },


        // =====================================================
        // XR FRAME UPDATE
        // =====================================================

        tick: function () {

            if (
                !this.arActive
                ||
                this.placed
                ||
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
            // NO SURFACE FOUND
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
            // VALID SURFACE FOUND
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
                'Surface detected - tap to place the industrial cell.'
            );

        },


        // =====================================================
        // PLACE INDUSTRIAL CELL
        // =====================================================

        placeCell: function () {

            if (
                !this.hasHit
                ||
                this.placed
            ) {

                return;

            }


            // =================================================
            // POSITION
            // =================================================

            this.cell
                .object3D
                .position
                .copy(
                    this.lastHitPosition
                );


            // =================================================
            // FIXED SCALE
            // =================================================
            //
            // No automatic scaling.
            //
            // The model now behaves like a real-world object:
            // physical camera translation changes its apparent
            // size naturally through perspective.
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

            this.rotationY =
                0;


            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    this.rotationY,
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


            this.setInstruction(
                'Placed - move around the model naturally or use Rotate.'
            );


            console.log(
                'Industrial cell placed in AR.'
            );

        },


        // =====================================================
        // ROTATE PLACED MODEL
        // =====================================================

        rotatePlacedModel: function () {

            if (
                !this.arActive
                ||
                !this.placed
            ) {

                return;

            }


            this.rotationY +=
                this.rotationStep;


            // Wrap angle after one complete revolution.

            if (
                this.rotationY >=
                Math.PI * 2
            ) {

                this.rotationY -=
                    Math.PI * 2;

            }


            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    this.rotationY,
                    0
                );


            const degrees =
                Math.round(
                    THREE.MathUtils.radToDeg(
                        this.rotationY
                    )
                );


            this.setInstruction(
                'Model rotation: '
                +
                degrees
                +
                '°'
            );

        },


        // =====================================================
        // REPOSITION MODEL
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


            this.rotationY =
                0;


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


            this.setInstruction(
                'Move the phone and select another surface.'
            );

        },


        // =====================================================
        // INSTRUCTION TEXT
        // =====================================================

        setInstruction: function (
            text
        ) {

            if (
                this.instruction
            ) {

                this.instruction
                    .textContent =
                        text;

            }

        },


        // =====================================================
        // EXIT AR
        // =====================================================

        stopAR: function () {

            console.log(
                'Leaving AR mode.'
            );


            // =================================================
            // REMOVE SELECT EVENT
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
                        'AR hit-test cleanup warning:',
                        error
                    );

                }

            }


            // =================================================
            // RESET XR STATE
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


            this.rotationY =
                0;


            // =================================================
            // HIDE AR UI
            // =================================================

            if (
                this.overlay
            ) {

                this.overlay
                    .style
                    .display =
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
            // RESTORE VIRTUAL FLOOR
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
            // RESTORE NORMAL BACKGROUND
            // =================================================

            this.sceneEl.setAttribute(
                'background',
                'color',
                '#ECECEC'
            );


            // =================================================
            // RESTORE NORMAL CELL TRANSFORM
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

        }

    }
);