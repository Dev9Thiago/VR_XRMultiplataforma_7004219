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
            // LAST VALID SURFACE HIT
            // =================================================

            this.lastHitPosition =
                new THREE.Vector3();


            this.lastHitQuaternion =
                new THREE.Quaternion();


            // =================================================
            // FIXED AR SCALE
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

                    // A-Frame sometimes needs a short moment
                    // before ar-mode becomes available.

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
                // LOCAL WORLD SPACE
                // =================================================

                this.referenceSpace =
                    await session
                        .requestReferenceSpace(
                            'local'
                        );


                // =================================================
                // HIT TEST
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
                    'AR surface detection initialized.'
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

            }

        },


        // =====================================================
        // MAIN AR UPDATE
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


            const temporaryScale =
                new THREE.Vector3();


            matrix.decompose(

                this.lastHitPosition,

                this.lastHitQuaternion,

                temporaryScale

            );


            // =================================================
            // MOVE RETICLE TO DETECTED SURFACE
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

        },


        // =====================================================
        // PLACE INDUSTRIAL CELL
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
            // POSITION
            // =================================================

            this.cell
                .object3D
                .position
                .copy(
                    this.lastHitPosition
                );


            // =================================================
            // KEEP CELL UPRIGHT
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
            // FIXED AR SCALE
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
            // SHOW MODEL
            // =================================================

            this.cell
                .object3D
                .visible =
                    true;


            this.placed =
                true;


            // =================================================
            // HIDE RETICLE
            // =================================================

            if (
                this.reticle
            ) {

                this.reticle
                    .object3D
                    .visible =
                        false;

            }


            console.log(
                'Industrial cell placed in AR.'
            );

        },


        // =====================================================
        // EXIT AR
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
            // RESET STATE
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
            // HIDE RETICLE
            // =================================================

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
            // RESTORE NORMAL CELL
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