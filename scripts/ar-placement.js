AFRAME.registerComponent('ar-placement', {

    init: function () {

        this.sceneEl = this.el;

        this.cell =
            document.querySelector('#industrial-cell');

        this.reticle =
            document.querySelector('#ar-reticle');

        this.overlay =
            document.querySelector('#ar-overlay');

        this.scaleUpButton =
            document.querySelector('#ar-scale-up');

        this.scaleDownButton =
            document.querySelector('#ar-scale-down');

        this.resetButton =
            document.querySelector('#ar-reset-placement');


        this.xrSession =
            null;

        this.viewerSpace =
            null;

        this.referenceSpace =
            null;

        this.hitTestSource =
            null;

        this.hitTestSourceRequested =
            false;

        this.hasHit =
            false;

        this.placed =
            false;


        this.currentScale =
            0.40;


        this.lastHitMatrix =
            null;


        // Original normal-scene transform
        this.normalPosition =
            this.cell.object3D.position.clone();

        this.normalQuaternion =
            this.cell.object3D.quaternion.clone();

        this.normalScale =
            this.cell.object3D.scale.clone();


        this.sceneEl.addEventListener(
            'enter-vr',
            () => {

                const session =
                    this.sceneEl.xrSession;

                if (!session) {
                    return;
                }


                const mode =
                    session.mode;


                if (mode === 'immersive-ar') {

                    this.startAR(
                        session
                    );

                }

            }
        );


        this.sceneEl.addEventListener(
            'exit-vr',
            () => {

                this.stopAR();

            }
        );


        if (this.scaleUpButton) {

            this.scaleUpButton.addEventListener(
                'click',
                () => {

                    this.changeScale(
                        0.05
                    );

                }
            );

        }


        if (this.scaleDownButton) {

            this.scaleDownButton.addEventListener(
                'click',
                () => {

                    this.changeScale(
                        -0.05
                    );

                }
            );

        }


        if (this.resetButton) {

            this.resetButton.addEventListener(
                'click',
                () => {

                    this.resetPlacement();

                }
            );

        }

    },


    // =========================================================
    // START AR
    // =========================================================

    async startAR(
        session
    ) {

        this.xrSession =
            session;


        this.placed =
            false;

        this.hasHit =
            false;

        this.hitTestSourceRequested =
            false;


        if (this.overlay) {

            this.overlay.style.display =
                'flex';

        }


        // Hide the industrial cell until a
        // valid surface is detected and selected.
        this.cell.object3D.visible =
            false;


        this.reticle.object3D.visible =
            false;


        try {

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


            this.hitTestSource =
                await session
                    .requestHitTestSource({
                        space:
                            this.viewerSpace
                    });


            this.hitTestSourceRequested =
                true;


            session.addEventListener(
                'select',
                () => {

                    this.placeCell();

                }
            );

        }

        catch (
            error
        ) {

            console.error(
                'AR hit-test initialization failed:',
                error
            );

        }

    },


    // =========================================================
    // STOP AR
    // =========================================================

    stopAR: function () {

        if (
            this.hitTestSource
        ) {

            this.hitTestSource.cancel();

        }


        this.hitTestSource =
            null;

        this.xrSession =
            null;

        this.viewerSpace =
            null;

        this.referenceSpace =
            null;

        this.hitTestSourceRequested =
            false;

        this.hasHit =
            false;

        this.placed =
            false;


        if (this.reticle) {

            this.reticle.object3D.visible =
                false;

        }


        if (this.overlay) {

            this.overlay.style.display =
                'none';

        }


        // Restore normal desktop/mobile/VR position
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

    },


    // =========================================================
    // FRAME UPDATE
    // =========================================================

    tick: function () {

        if (
            !this.xrSession ||
            !this.hitTestSource ||
            this.placed
        ) {

            return;

        }


        const frame =
            this.sceneEl.frame;


        if (!frame) {

            return;

        }


        try {

            const results =
                frame.getHitTestResults(
                    this.hitTestSource
                );


            if (
                results.length > 0
            ) {

                const hit =
                    results[0];


                const pose =
                    hit.getPose(
                        this.referenceSpace
                    );


                if (!pose) {

                    return;

                }


                this.hasHit =
                    true;


                this.lastHitMatrix =
                    pose.transform.matrix;


                this.reticle.object3D.visible =
                    true;


                this.reticle.object3D.matrix.fromArray(
                    pose.transform.matrix
                );


                this.reticle.object3D.matrix.decompose(
                    this.reticle.object3D.position,
                    this.reticle.object3D.quaternion,
                    this.reticle.object3D.scale
                );

            }

            else {

                this.hasHit =
                    false;


                this.reticle.object3D.visible =
                    false;

            }

        }

        catch (
            error
        ) {

            console.error(
                'AR hit-test frame error:',
                error
            );

        }

    },


    // =========================================================
    // PLACE INDUSTRIAL CELL
    // =========================================================

    placeCell: function () {

        if (
            !this.hasHit ||
            !this.lastHitMatrix ||
            this.placed
        ) {

            return;

        }


        const matrix =
            new THREE.Matrix4();


        matrix.fromArray(
            this.lastHitMatrix
        );


        const position =
            new THREE.Vector3();

        const quaternion =
            new THREE.Quaternion();

        const scale =
            new THREE.Vector3();


        matrix.decompose(
            position,
            quaternion,
            scale
        );


        this.cell.object3D.position.copy(
            position
        );


        // Keep the cell vertical.
        // We use the detected position but do not
        // inherit arbitrary surface tilt.
        this.cell.object3D.rotation.set(
            0,
            0,
            0
        );


        this.cell.object3D.scale.set(
            this.currentScale,
            this.currentScale,
            this.currentScale
        );


        this.cell.object3D.visible =
            true;


        this.reticle.object3D.visible =
            false;


        this.placed =
            true;

    },


    // =========================================================
    // SCALE
    // =========================================================

    changeScale: function (
        delta
    ) {

        this.currentScale +=
            delta;


        this.currentScale =
            Math.max(
                0.15,
                Math.min(
                    this.currentScale,
                    1.00
                )
            );


        if (
            this.placed
        ) {

            this.cell.object3D.scale.set(
                this.currentScale,
                this.currentScale,
                this.currentScale
            );

        }

    },


    // =========================================================
    // RESET PLACEMENT
    // =========================================================

    resetPlacement: function () {

        if (
            !this.xrSession
        ) {

            return;

        }


        this.placed =
            false;


        this.cell.object3D.visible =
            false;


        this.reticle.object3D.visible =
            false;

    }

});