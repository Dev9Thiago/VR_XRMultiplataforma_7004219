// =============================================================
// AR SURFACE PLACEMENT
// =============================================================
//
// This component:
// 1. Detects when the scene enters AR.
// 2. Creates a WebXR hit-test source.
// 3. Shows a reticle on detected surfaces.
// 4. Places the industrial cell when the user taps.
// 5. Restores the normal scene when AR ends.
//
// IMPORTANT:
// Hit testing is initialized ONLY in AR.
// It is never requested or used during VR.
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
            // NORMAL SCENE TRANSFORM
            // =================================================

            this.normalPosition =
                this.cell.object3D
                    .position
                    .clone();


            this.normalQuaternion =
                this.cell.object3D
                    .quaternion
                    .clone();


            this.normalScale =
                this.cell.object3D
                    .scale
                    .clone();


            // =================================================
            // XR SESSION START
            // =================================================

            this.sceneEl.renderer.xr.addEventListener(
                'sessionstart',
                async () => {

                    const session =
                        this.sceneEl
                            .renderer
                            .xr
                            .getSession();


                    if (!session) {

                        return;

                    }


                    // -----------------------------------------
                    // IMPORTANT
                    // Only initialize placement in AR mode.
                    // -----------------------------------------

                    if (
                        this.sceneEl.is(
                            'ar-mode'
                        )
                    ) {

                        await this.startAR(
                            session
                        );

                    }

                }
            );


            // =================================================
            // XR SESSION END
            // =================================================

            this.sceneEl.renderer.xr.addEventListener(
                'sessionend',
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

        startAR: async function (
            session
        ) {

            console.log(
                'Starting AR placement mode...'
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
            // AR SCENE SETUP
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
                        .requestHitTestSource !==
                    'function'
                ) {

                    throw new Error(
                        'requestHitTestSource is not supported.'
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
                            this.hasHit &&
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
                    'AR hit-test initialization error:',
                    error
                );


                this.setInstruction(
                    'Surface detection could not be initialized.'
                );


                // Do NOT hide the model forever if hit-test fails.

                this.cell.object3D.visible =
                    true;

            }

        },


        // =====================================================
        // FRAME LOOP
        // =====================================================

        tick: function () {

            if (
                !this.arActive ||
                this.placed ||
                !this.hitTestSource ||
                !this.referenceSpace
            ) {

                return;

            }


            const frame =
                this.sceneEl
                    .renderer
                    .xr
                    .getFrame();


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
                    'getHitTestResults error:',
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
            // SURFACE FOUND
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


                this.reticle.object3D.position.copy(
                    this.lastHitPosition
                );


                this.reticle.object3D.quaternion.copy(
                    this.lastHitQuaternion
                );

            }


            this.setInstruction(
                'Surface detected - tap to place the cell.'
            );

        },


        // =====================================================
        // PLACE CELL
        // =====================================================

        placeCell: function () {

            if (
                !this.hasHit ||
                this.placed
            ) {

                return;

            }


            // =================================================
            // POSITION
            // =================================================

            this.cell.object3D.position.copy(
                this.lastHitPosition
            );


            // =================================================
            // SCALE
            // =================================================
            //
            // AR needs a much smaller version than desktop.
            // =================================================

            this.cell.object3D.scale.set(
                0.35,
                0.35,
                0.35
            );


            // =================================================
            // ROTATION
            // =================================================
            //
            // Keep the industrial cell upright.
            // =================================================

            this.cell.object3D.rotation.set(
                0,
                0,
                0
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
                'Industrial cell placed in AR.'
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
                'Stopping AR placement mode...'
            );


            // =================================================
            // REMOVE SELECT EVENT
            // =================================================

            if (
                this.session &&
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
                        'Hit-test source cancellation warning:',
                        error
                    );

                }

            }


            // =================================================
            // RESET AR STATE
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
            // HIDE AR UI
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
            // RESTORE NORMAL SCENE
            // =================================================

            this.cell.object3D.visible =
                true;


            this.cell.object3D.position.copy(
                this.normalPosition
            );


            this.cell.object3D.quaternion.copy(
                this.normalQuaternion
            );


            this.cell.object3D.scale.copy(
                this.normalScale
            );

        }

    }
);