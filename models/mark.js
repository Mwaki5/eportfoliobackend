"use strict";

module.exports = (sequelize, DataTypes) => {
  const Marks = sequelize.define(
    "Marks",
    {
      markId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      studentId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "Users",
          key: "userId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      unitCode: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "Units",
          key: "unitCode",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      theory1: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      theory2: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      theory3: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      prac1: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      prac2: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      prac3: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "Marks",
      timestamps: true,
    }
  );

  Marks.associate = (models) => {
    Marks.belongsTo(models.User, { foreignKey: "studentId", as: "User" });
    Marks.belongsTo(models.Unit, { foreignKey: "unitCode", as: "Unit" });
  };

  return Marks;
};
