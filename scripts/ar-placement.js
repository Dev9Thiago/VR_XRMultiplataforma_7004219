// =============================================================
// AR SURFACE PLACEMENT
// =============================================================
//
// This component:
// 1. Detects AR mode reliably.
// 2. Makes the scene transparent so camera passthrough is visible.
// 3. Hides the virtual floor while in AR.
// 4. Creates a WebXR hit-test source.
// 5. Displays a reticle on detected real-world surfaces.
// 6. Places the industrial cell on tap.
// 7. Restores the normal desktop/VR scene when AR exits.
//
// VR behavior is intentionally left untouched.
// =============================================================


AFRAME.registerComponent(
    'ar-placement',
    {

        // =====================================================
        // INIT
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


            this.lastHitPosition =
                new THREE.Vector3();


            this.lastHitQuaternion =
                new THREE.Quaternion();


            // =================================================
            // SAVE NORMAL TRANSFORM
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

                    // A-Frame may not have updated ar-mode
                    // immediately when enter-vr fires.
                    // Small delay makes the state reliable.

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
                    'AR session was not available.'
                );

                return;

            }


            console.log(
                'AR mode detected.'
            );


            this.session =
                session;


            this.arActive =
                true;


            this.placed =
                false;


            this.hasHit =
                false;


            // =================================================
            // CAMERA PASSTHROUGH
            // =================================================
            //
            // Remove opaque scene background.
            // A transparent WebGL backbuffer allows the
            // real camera image to show behind the scene.
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
            //
            // The desktop floor must not cover the camera view.
            // =================================================

            if (
                this.floor
            ) {

                this.floor.object3D.visible =
                    false;

            }


            // =================================================
            // HIDE MODEL UNTIL PLACEMENT
            // =================================================

            this.cell.object3D.visible =
                false;


            if (
                this.reticle
            ) {

                this.reticle.object3D.visible =
                    false;

            }


            if (
                this.overlay
            ) {

                this.overlay.style.display =
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
                        'WebXR hit-test API is unavailable.'
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
                    'AR hit-test initialized successfully.'
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
                    'AR initialization failed:',
                    error
                );


                this.setInstruction(
                    'Surface detection could not be initialized.'
                );

            }

        },


        // =====================================================
        // AR FRAME UPDATE
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


            // A-Frame exposes the active XRFrame here.
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
                    'Hit-test frame error:',
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

                    this.reticle.object3D.visible =
                        false;

                }


                this.setInstruction(
                    'Searching for a surface...'
                );


                return;

            }


            // =================================================
            // VALID HIT
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


            this.setInstruction(
                'Surface detected - tap to place the industrial cell.'
            );

        },


        // =====================================================
        // PLACE CELL
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
            // KEEP MODEL UPRIGHT
            // =================================================

            this.cell
                .object3D
                .rotation
                .set(
                    0,
                    0,
                    0
                );


            // =================================================
            // AR SCALE
            // =================================================

            this.cell
                .object3D
                .scale
                .set(
                    0.30,
                    0.30,
                    0.30
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


            this.setInstruction(
                'Industrial cell placed.'
            );


            console.log(
                'Industrial cell placed.'
            );

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
        // STOP AR
        // =====================================================

        stopAR: function () {

            console.log(
                'Leaving AR mode.'
            );


            // =================================================
            // REMOVE SELECT LISTENER
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


            // =================================================
            // AR UI
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

                this.reticle.object3D.visible =
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
            // RESTORE SCENE BACKGROUND
            // =================================================

            this.sceneEl.setAttribute(
                'background',
                'color',
                '#ECECEC'
            );


            // =================================================
            // RESTORE INDUSTRIAL CELL
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