// =============================================================
// AR SURFACE DETECTION + COMPLETE SCENE PLACEMENT
// =============================================================
//
// AR behavior:
//
// 1. Enter immersive AR.
// 2. Enable camera passthrough.
// 3. Hide the normal virtual floor.
// 4. Hide the complete industrial exhibition.
// 5. Detect a real horizontal surface.
// 6. Display the green placement reticle.
// 7. Tap the detected surface.
// 8. Place BOTH:
//      - industrial conveyor cell
//      - CAD model display station
//
// Everything is contained inside #xr-content, therefore the
// relative placement between both systems is preserved.
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


            // Complete virtual exhibition.

            this.xrContent =
                document.querySelector(
                    '#xr-content'
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
            // AR DISPLAY SCALE
            // =================================================
            //
            // The complete exhibition is several meters wide.
            //
            // Scaling the parent preserves the proportion
            // between:
            //
            // conveyor
            // CAD table
            // Robot 6R
            //
            // without changing the individual objects.
            //
            // =================================================

            this.arScale =
                0.30;


            // =================================================
            // SAVE NORMAL NON-AR TRANSFORM
            // =================================================

            this.normalPosition =
                this.xrContent
                    .object3D
                    .position
                    .clone();


            this.normalQuaternion =
                this.xrContent
                    .object3D
                    .quaternion
                    .clone();


            this.normalScale =
                this.xrContent
                    .object3D
                    .scale
                    .clone();


            // =================================================
            // ENTER XR
            // =================================================

            this.sceneEl.addEventListener(
                'enter-vr',
                () => {

                    // A-Frame needs a short moment to determine
                    // whether the XR session is VR or AR.

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
            // HIDE COMPLETE EXHIBITION UNTIL PLACED
            // =================================================

            if (
                this.xrContent
            ) {

                this.xrContent
                    .object3D
                    .visible =
                        false;

            }


            // =================================================
            // HIDE RETICLE INITIALLY
            // =================================================

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
                // VIEWER REFERENCE SPACE
                // =================================================

                this.viewerSpace =
                    await session
                        .requestReferenceSpace(
                            'viewer'
                        );


                // =================================================
                // WORLD REFERENCE SPACE
                // =================================================

                this.referenceSpace =
                    await session
                        .requestReferenceSpace(
                            'local'
                        );


                // =================================================
                // CHECK HIT-TEST API
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


                // =================================================
                // CREATE HIT-TEST SOURCE
                // =================================================

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

                            this.placeContent();

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
        // AR UPDATE LOOP
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
            // NO SURFACE DETECTED
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
            // MOVE RETICLE TO REAL SURFACE
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
        // PLACE COMPLETE XR CONTENT
        // =====================================================

        placeContent: function () {

            if (
                !this.arActive
                ||
                !this.hasHit
                ||
                this.placed
                ||
                !this.xrContent
            ) {

                return;

            }


            // =================================================
            // PLACE ROOT ON DETECTED REAL SURFACE
            // =================================================

            this.xrContent
                .object3D
                .position
                .copy(
                    this.lastHitPosition
                );


            // =================================================
            // KEEP THE INDUSTRIAL EXHIBITION UPRIGHT
            // =================================================
            //
            // We deliberately do not inherit arbitrary surface
            // rotation because the conveyor and table must stay
            // vertically upright.
            //
            // =================================================

            this.xrContent
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

            this.xrContent
                .object3D
                .scale
                .set(
                    this.arScale,
                    this.arScale,
                    this.arScale
                );


            // =================================================
            // SHOW COMPLETE EXHIBITION
            // =================================================

            this.xrContent
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
                'Complete industrial exhibition placed in AR.'
            );

        },


        // =====================================================
        // STOP AR
        // =====================================================

        stopAR: function () {

            console.log(
                'Leaving AR mode.'
            );


            // =================================================
            // REMOVE TAP LISTENER
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
            // RESTORE NORMAL FLOOR
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
            // RESTORE NORMAL DESKTOP/MOBILE CONTENT
            // =================================================

            if (
                this.xrContent
            ) {

                this.xrContent
                    .object3D
                    .visible =
                        true;


                this.xrContent
                    .object3D
                    .position
                    .copy(
                        this.normalPosition
                    );


                this.xrContent
                    .object3D
                    .quaternion
                    .copy(
                        this.normalQuaternion
                    );


                this.xrContent
                    .object3D
                    .scale
                    .copy(
                        this.normalScale
                    );

            }

        }

    }
);